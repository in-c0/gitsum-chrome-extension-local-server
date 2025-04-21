// Background script for handling API calls and authentication
let authToken = null
let isPremiumUser = false

// Check subscription status
async function checkSubscription() {
  try {
    const { token } = await chrome.storage.local.get("token")
    if (!token) return false

    authToken = token
    const response = await fetch("https://api.gitsum.com/subscription", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return false

    const data = await response.json()
    isPremiumUser = data.isPremium
    return isPremiumUser
  } catch (error) {
    console.error("Error checking subscription:", error)
    return false
  }
}

// Process repository with repomix
async function processRepository(repoUrl) {
  try {
    if (!authToken) return null

    const response = await fetch("https://api.gitsum.com/process", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repoUrl }),
    })

    if (!response.ok) throw new Error("Failed to process repository")

    return await response.json()
  } catch (error) {
    console.error("Error processing repository:", error)
    return null
  }
}

// Send message to LLM
async function sendMessageToLLM(repoData, message) {
  try {
    if (!authToken) return null

    const response = await fetch("https://api.gitsum.com/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repoData,
        message,
      }),
    })

    if (!response.ok) throw new Error("Failed to get response from LLM")

    return await response.json()
  } catch (error) {
    console.error("Error sending message to LLM:", error)
    return null
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkSubscription") {
    checkSubscription().then((isPremium) => {
      sendResponse({ isPremium })
    })
    return true // Required for async response
  }

  if (request.action === "processRepository") {
    processRepository(request.repoUrl).then((data) => {
      sendResponse({ data })
    })
    return true
  }

  if (request.action === "sendMessage") {
    sendMessageToLLM(request.repoData, request.message).then((response) => {
      sendResponse({ response })
    })
    return true
  }
})

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  checkSubscription()
})
