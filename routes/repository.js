import express from "express"
import { processRepository, getRepositoryData, getProcessingStatus } from "../controllers/repositoryController.js"
import { protect, premiumOnly } from "../middleware/auth.js"

const router = express.Router()

router.post("/process", protect, premiumOnly, processRepository)
router.get("/:owner/:name", protect, premiumOnly, getRepositoryData)
router.get("/status/:owner/:name", protect, premiumOnly, getProcessingStatus)

export default router
