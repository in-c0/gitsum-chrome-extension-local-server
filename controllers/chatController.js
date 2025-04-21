import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import ChatHistory from "../models/ChatHistory.js"
import Repository from "../models/Repository.js"

// Helper function to create repository context
const createRepositoryContext = (repoData) => {
  // Format the repository data into a string that can be used in the prompt
  let context = ""
  if (!repoData) return context

  if (repoData.summary) {
    context += `Repository Summary:\n${repoData.summary}\n\n`
  }

  if (repoData.languages) {
    context += `Languages:\n${Object.entries(repoData.languages)
      .map(([lang, percentage]) => `${lang}: ${percentage}%`)
      .join(", ")}\n\n`
  }

  if (repoData.dependencies) {
    context += `Dependencies:\n${Object.keys(repoData.dependencies).join(", ")}\n\n`
  }

  if (repoData.fileStructure) {
    context += `File Structure:\n${JSON.stringify(repoData.fileStructure, null, 2)}\n\n`
  }

  if (repoData.keyFiles) {
    context += `Key Files:\n${repoData.keyFiles.map((file) => `Path: ${file.path}\nContent:\n${file.content}`).join("\n\n")}\n\n`
  }

  if (repoData.codePatterns) {
    context += `Code Patterns:\n${repoData.codePatterns.join(", ")}\n\n`
  }

  return context
}

// @desc    Send message to LLM
// @route   POST /api/chat/send
// @access  Private/Premium
export const sendMessage = async (req, res) => {
  try {
    const { repositoryUrl, message } = req.body

    if (!repositoryUrl || !message) {
      res.status(400)
      throw new Error("Repository URL and message are required")
    }

    // Extract owner and name from URL
    const urlParts = repositoryUrl.split("/")
    const owner = urlParts[urlParts.length - 2]
    const name = urlParts[urlParts.length - 1]

    // Get repository data
    const repository = await Repository.findOne({ owner, name })

    if (!repository || repository.processingStatus !== "completed") {
      res.status(404)
      throw new Error("Repository data not found or processing incomplete")
    }

    // Get or create chat history
    let chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      repositoryUrl,
    })

    if (!chatHistory) {
      chatHistory = new ChatHistory({
        userId: req.user._id,
        repositoryUrl,
        messages: [],
      })
    }

    // Add user message to history
    chatHistory.messages.push({
      role: "user",
      content: message,
    })

    // Prepare context for LLM
    const repoData = repository.processedData
    const repoContext = createRepositoryContext(repoData)

    // Prepare conversation history for LLM
    const conversationHistory = chatHistory.messages
      .slice(-10) // Only use the last 10 messages to avoid token limits
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n")

    // Generate response from LLM
    const prompt = `You are GITSUM, an AI assistant specialized in helping developers understand GitHub repositories.

Repository Information:
${repoContext}

Previous Conversation:
${conversationHistory}

User: ${message}

Provide a helpful, accurate, and concise response based on the repository information. If you don't know something or if the information is not in the provided context, acknowledge that.`

    const ai = openai(process.env.OPENAI_API_KEY)
    const response = await generateText(
      {
        model: "gpt-3.5-turbo",
        system: prompt,
        apiKey: process.env.OPENAI_API_KEY,
      },
      ai,
    )

    // Add assistant message to history
    chatHistory.messages.push({
      role: "assistant",
      content: response,
    })

    await chatHistory.save()

    res.json({ message: response })
  } catch (error) {
    console.error("Error in sendMessage:", error)
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get chat history
// @route   GET /api/chat/history/:repositoryUrl
// @access  Private/Premium
export const getChatHistory = async (req, res) => {
  try {
    const { repositoryUrl } = req.params

    const chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      repositoryUrl,
    })

    if (!chatHistory) {
      return res.json({ messages: [] })
    }

    res.json({ messages: chatHistory.messages })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Clear chat history
// @route   DELETE /api/chat/history/:repositoryUrl
// @access  Private/Premium
export const clearChatHistory = async (req, res) => {
  try {
    const { repositoryUrl } = req.params

    const chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      repositoryUrl,
    })

    if (!chatHistory) {
      return res.status(404).json({ message: "Chat history not found" })
    }

    await ChatHistory.deleteOne({
      userId: req.user._id,
      repositoryUrl,
    })

    res.json({ message: "Chat history cleared" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
