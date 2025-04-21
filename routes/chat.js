import express from "express"
import { sendMessage, getChatHistory, clearChatHistory } from "../controllers/chatController.js"
import { protect, premiumOnly } from "../middleware/auth.js"

const router = express.Router()

router.post("/send", protect, premiumOnly, sendMessage)
router.get("/history/:repositoryUrl", protect, premiumOnly, getChatHistory)
router.delete("/history/:repositoryUrl", protect, premiumOnly, clearChatHistory)

export default router
