import mongoose from "mongoose"
import { env } from "./env.js"
import logger from "../utils/logger.js"

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`)
    process.exit(1)
  }
}
