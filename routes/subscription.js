import express from "express"
import {
  getSubscription,
  createSubscription,
  cancelSubscription,
  handleWebhook,
  updatePaymentMethod,
} from "../controllers/subscriptionController.js"
import { protect } from "../middleware/auth.js"

const router = express.Router()

router.get("/", protect, getSubscription)
router.post("/create", protect, createSubscription)
router.post("/cancel", protect, cancelSubscription)
router.post("/webhook", handleWebhook)
router.put("/payment-method", protect, updatePaymentMethod)

export default router
