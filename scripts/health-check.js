import fetch from "node-fetch"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const PORT = process.env.PORT || 3000
const API_URL = process.env.API_URL || `http://localhost:${PORT}`

async function checkHealth() {
  try {
    console.log(`Checking health of API at ${API_URL}/health...`)

    const response = await fetch(`${API_URL}/health`)

    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`)
    }

    const data = await response.json()
    console.log("Health check successful:", data)

    return true
  } catch (error) {
    console.error("Health check failed:", error.message)
    return false
  }
}

// Run the health check
checkHealth()
  .then((isHealthy) => {
    process.exit(isHealthy ? 0 : 1)
  })
  .catch((error) => {
    console.error("Unexpected error:", error)
    process.exit(1)
  })
