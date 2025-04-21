import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import User from "../models/User.js"
import Subscription from "../models/Subscription.js"

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, "../.env") })

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({})
    await Subscription.deleteMany({})

    console.log("Previous data cleared")

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10)
    const admin = await User.create({
      name: "Admin User",
      email: "admin@gitsum.com",
      password: adminPassword,
      isPremium: true,
      subscriptionStatus: "active",
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    })

    // Create regular user
    const userPassword = await bcrypt.hash("user123", 10)
    const user = await User.create({
      name: "Regular User",
      email: "user@gitsum.com",
      password: userPassword,
      isPremium: false,
    })

    // Create premium user
    const premiumPassword = await bcrypt.hash("premium123", 10)
    const premiumUser = await User.create({
      name: "Premium User",
      email: "premium@gitsum.com",
      password: premiumPassword,
      isPremium: true,
      subscriptionStatus: "active",
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    })

    // Create subscription for premium user
    const subscription = await Subscription.create({
      userId: premiumUser._id,
      stripeCustomerId: "cus_mock_id",
      stripeSubscriptionId: "sub_mock_id",
      stripePriceId: "price_mock_id",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false,
    })

    console.log("Seed data created successfully")
    console.log("Admin user created:", admin.email)
    console.log("Regular user created:", user.email)
    console.log("Premium user created:", premiumUser.email)
    console.log("Subscription created for premium user")

    process.exit(0)
  } catch (error) {
    console.error("Error seeding data:", error)
    process.exit(1)
  }
}

seedData()
