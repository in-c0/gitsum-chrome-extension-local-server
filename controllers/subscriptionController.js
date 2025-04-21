import Stripe from "stripe"
import User from "../models/User.js"
import Subscription from "../models/Subscription.js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// @desc    Get user subscription
// @route   GET /api/subscription
// @access  Private
export const getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id })

    if (!subscription) {
      return res.json({
        isPremium: false,
        subscription: null,
      })
    }

    res.json({
      isPremium: req.user.isPremium,
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Create subscription
// @route   POST /api/subscription/create
// @access  Private
export const createSubscription = async (req, res) => {
  try {
    const { paymentMethodId, priceId } = req.body

    // Get user
    const user = await User.findById(req.user._id)

    // Check if user already has a subscription
    const existingSubscription = await Subscription.findOne({ userId: user._id })

    if (existingSubscription && existingSubscription.status === "active") {
      res.status(400)
      throw new Error("User already has an active subscription")
    }

    let stripeCustomerId = user.stripeCustomerId

    // If user doesn't have a Stripe customer ID, create one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })

      stripeCustomerId = customer.id
      user.stripeCustomerId = stripeCustomerId
      await user.save()
    } else {
      // Update the customer's payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      })

      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })
    }

    // Create the subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
    })

    // Create subscription in database
    const subscription = await Subscription.create({
      userId: user._id,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    })

    // Update user subscription status
    user.isPremium = true
    user.subscriptionId = subscription._id
    user.subscriptionStatus = "active"
    user.subscriptionEndDate = new Date(stripeSubscription.current_period_end * 1000)
    await user.save()

    res.status(201).json({
      subscriptionId: subscription._id,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret,
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// @desc    Cancel subscription
// @route   POST /api/subscription/cancel
// @access  Private
export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const subscription = await Subscription.findOne({ userId: user._id })

    if (!subscription) {
      res.status(404)
      throw new Error("Subscription not found")
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // Update subscription in database
    subscription.cancelAtPeriodEnd = true
    await subscription.save()

    res.json({
      message: "Subscription will be canceled at the end of the billing period",
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// @desc    Update payment method
// @route   PUT /api/subscription/payment-method
// @access  Private
export const updatePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body

    const user = await User.findById(req.user._id)
    const subscription = await Subscription.findOne({ userId: user._id })

    if (!subscription) {
      res.status(404)
      throw new Error("Subscription not found")
    }

    // Attach new payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripeCustomerId,
    })

    // Set as default payment method
    await stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    res.json({ message: "Payment method updated successfully" })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// @desc    Handle Stripe webhook events
// @route   POST /api/subscription/webhook
// @access  Public
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"]

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  // Handle the event
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object)
      break
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object)
      break
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object)
      break
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
}

// Helper functions for webhook events
async function handleSubscriptionUpdated(subscriptionObject) {
  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionObject.id,
    })

    if (!subscription) return

    subscription.status = subscriptionObject.status
    subscription.currentPeriodStart = new Date(subscriptionObject.current_period_start * 1000)
    subscription.currentPeriodEnd = new Date(subscriptionObject.current_period_end * 1000)
    subscription.cancelAtPeriodEnd = subscriptionObject.cancel_at_period_end
    await subscription.save()

    // Update user subscription status
    const user = await User.findById(subscription.userId)
    user.subscriptionStatus = subscriptionObject.status
    user.subscriptionEndDate = new Date(subscriptionObject.current_period_end * 1000)

    if (subscriptionObject.status === "active") {
      user.isPremium = true
    } else {
      user.isPremium = false
    }

    await user.save()
  } catch (error) {
    console.error("Error updating subscription:", error)
  }
}

async function handleSubscriptionDeleted(subscriptionObject) {
  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionObject.id,
    })

    if (!subscription) return

    subscription.status = "expired"
    await subscription.save()

    // Update user subscription status
    const user = await User.findById(subscription.userId)
    user.isPremium = false
    user.subscriptionStatus = "expired"
    await user.save()
  } catch (error) {
    console.error("Error handling subscription deletion:", error)
  }
}

async function handleInvoicePaymentSucceeded(invoiceObject) {
  try {
    if (!invoiceObject.subscription) return

    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoiceObject.subscription,
    })

    if (!subscription) return

    // Update subscription status
    subscription.status = "active"
    await subscription.save()

    // Update user subscription status
    const user = await User.findById(subscription.userId)
    user.isPremium = true
    user.subscriptionStatus = "active"
    await user.save()
  } catch (error) {
    console.error("Error handling invoice payment success:", error)
  }
}

async function handleInvoicePaymentFailed(invoiceObject) {
  try {
    if (!invoiceObject.subscription) return

    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoiceObject.subscription,
    })

    if (!subscription) return

    // We don't immediately change status on payment failure
    // as Stripe will retry the payment
    console.log(`Payment failed for subscription ${subscription.stripeSubscriptionId}`)
  } catch (error) {
    console.error("Error handling invoice payment failure:", error)
  }
}
