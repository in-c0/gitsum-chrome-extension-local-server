import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"
import Repository from "../models/Repository.js"
import User from "../models/User.js"

// @desc    Process a GitHub repository with repomix
// @route   POST /api/repository/process
// @access  Private/Premium
export const processRepository = async (req, res) => {
  try {
    const { repoUrl } = req.body

    if (!repoUrl) {
      res.status(400)
      throw new Error("Repository URL is required")
    }

    // Extract owner and name from URL
    const urlParts = repoUrl.split("/")
    const owner = urlParts[urlParts.length - 2]
    const name = urlParts[urlParts.length - 1]

    // Check if repository already exists and is recent (less than 24 hours old)
    const existingRepo = await Repository.findOne({ owner, name })

    if (existingRepo && existingRepo.processingStatus === "completed") {
      const lastProcessed = new Date(existingRepo.lastProcessed)
      const now = new Date()
      const hoursSinceLastProcessed = (now - lastProcessed) / (1000 * 60 * 60)

      if (hoursSinceLastProcessed < 24) {
        return res.json({
          message: "Repository data retrieved from cache",
          data: existingRepo.processedData,
        })
      }
    }

    // Create or update repository record
    let repository = existingRepo

    if (!repository) {
      repository = new Repository({
        url: repoUrl,
        owner,
        name,
        processedData: {},
        processingStatus: "processing",
      })
    } else {
      repository.processingStatus = "processing"
      repository.errorMessage = null
    }

    await repository.save()

    // Process repository asynchronously
    processRepositoryAsync(repository._id, repoUrl, req.user._id)

    res.status(202).json({
      message: "Repository processing started",
      repositoryId: repository._id,
      status: "processing",
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// @desc    Get repository data
// @route   GET /api/repository/:owner/:name
// @access  Private/Premium
export const getRepositoryData = async (req, res) => {
  try {
    const { owner, name } = req.params

    const repository = await Repository.findOne({ owner, name })

    if (!repository) {
      res.status(404)
      throw new Error("Repository not found")
    }

    if (repository.processingStatus === "processing") {
      return res.status(202).json({
        message: "Repository is still being processed",
        status: "processing",
      })
    }

    if (repository.processingStatus === "failed") {
      return res.status(400).json({
        message: "Repository processing failed",
        error: repository.errorMessage,
        status: "failed",
      })
    }

    res.json({
      data: repository.processedData,
      status: "completed",
    })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

// @desc    Get repository processing status
// @route   GET /api/repository/status/:owner/:name
// @access  Private/Premium
export const getProcessingStatus = async (req, res) => {
  try {
    const { owner, name } = req.params

    const repository = await Repository.findOne({ owner, name })

    if (!repository) {
      res.status(404)
      throw new Error("Repository not found")
    }

    res.json({
      status: repository.processingStatus,
      lastProcessed: repository.lastProcessed,
      error: repository.errorMessage,
    })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

// Helper function to process repository asynchronously
async function processRepositoryAsync(repositoryId, repoUrl, userId) {
  try {
    // Create a temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repomix-"))

    try {
      // Clone the repository
      execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`, { stdio: "ignore" })

      // Run repomix on the repository
      const repomixOutput = execSync(`npx repomix analyze ${tempDir}`, { encoding: "utf-8" })

      // Parse the output
      const processedData = JSON.parse(repomixOutput)

      // Compress the data for LLM consumption
      const compressedData = compressRepositoryData(processedData)

      // Update repository record
      const repository = await Repository.findById(repositoryId)
      repository.processedData = compressedData
      repository.processingStatus = "completed"
      repository.lastProcessed = new Date()
      await repository.save()

      // Increment user's API usage
      await User.findByIdAndUpdate(userId, { $inc: { apiUsage: 1 } })

      console.log(`Repository ${repoUrl} processed successfully`)
    } finally {
      // Clean up temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error(`Error processing repository ${repoUrl}:`, error)

    // Update repository record with error
    await Repository.findByIdAndUpdate(repositoryId, {
      processingStatus: "failed",
      errorMessage: error.message,
    })
  }
}

// Helper function to compress repository data for LLM consumption
function compressRepositoryData(data) {
  // Extract the most important information from the repomix output
  // This is a simplified version - you would want to be more selective
  // based on what information is most useful for the LLM

  const compressed = {
    summary: data.summary,
    languages: data.languages,
    dependencies: data.dependencies,
    fileStructure: simplifyFileStructure(data.fileStructure),
    keyFiles: identifyKeyFiles(data),
    codePatterns: data.codePatterns || [],
  }

  return compressed
}

// Helper function to simplify file structure
function simplifyFileStructure(fileStructure, maxDepth = 3, currentDepth = 0) {
  if (!fileStructure || currentDepth >= maxDepth) {
    return null
  }

  const simplified = {}

  for (const [key, value] of Object.entries(fileStructure)) {
    if (typeof value === "object" && value !== null) {
      simplified[key] = simplifyFileStructure(value, maxDepth, currentDepth + 1)
    } else {
      simplified[key] = value
    }
  }

  return simplified
}

// Helper function to identify key files in the repository
function identifyKeyFiles(data) {
  const keyFiles = []

  // Add package.json if it exists
  if (data.dependencies && data.dependencies.packageJson) {
    keyFiles.push({
      path: "package.json",
      content: data.dependencies.packageJson,
      importance: "high",
    })
  }

  // Add README if it exists
  if (data.documentation && data.documentation.readme) {
    keyFiles.push({
      path: "README.md",
      content: data.documentation.readme,
      importance: "high",
    })
  }

  // Add other important files based on your criteria
  // This is just a placeholder - you would want to implement
  // more sophisticated logic based on your specific needs

  return keyFiles
}
