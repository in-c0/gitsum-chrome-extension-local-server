import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import authRoutes from "./routes/auth.js"
import subscriptionRoutes from "./routes/subscription.js"
import repositoryRoutes from "./routes/repository.js"
import chatRoutes from "./routes/chat.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { connectDB } from "./config/db.js"
import { env } from "./config/env.js"
import logger from "./utils/logger.js"

// Initialize express app
const app = express()
const PORT = env.port

// Connect to database
connectDB()

// Middleware
app.use(helmet()) // Security headers

// CORS configuration
const corsOptions = {
  origin: env.isDevelopment
    ? "*"
    : ["https://gitsum.com", "https://app.gitsum.com", "chrome-extension://[EXTENSION-ID]"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}
app.use(cors(corsOptions))

app.use(express.json()) // Parse JSON bodies

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
})

// Apply rate limiting to all routes
app.use(apiLimiter)

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/subscription", subscriptionRoutes)
app.use("/api/repository", repositoryRoutes)
app.use("/api/chat", chatRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", environment: env.nodeEnv })
})

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`Server running in ${env.nodeEnv} mode on port ${PORT}`)
})

export default app
