// Content script to inject the sidebar into GitHub pages
let repoData = null
let chatHistory = []
let sidebarInjected = false

// Check if current page is a GitHub repository
function isGitHubRepo() {
  return window.location.hostname === "github.com" && window.location.pathname.split("/").length >= 3
}

// Get repository URL
function getRepoUrl() {
  const pathParts = window.location.pathname.split("/")
  if (pathParts.length >= 3) {
    return `https://github.com/${pathParts[1]}/${pathParts[2]}`
  }
  return null
}

// Create sidebar HTML
function createSidebar() {
  const sidebar = document.createElement("div")
  sidebar.id = "gitsum-sidebar"
  sidebar.className = "gitsum-sidebar"

  sidebar.innerHTML = `
    <div class="gitsum-header">
      <h3>GITSUM</h3>
      <button id="gitsum-close" class="gitsum-close-btn">×</button>
    </div>
    <div id="gitsum-content" class="gitsum-content">
      <div id="gitsum-messages" class="gitsum-messages"></div>
      <div id="gitsum-subscription-notice" class="gitsum-subscription-notice" style="display: none;">
        <p>This feature requires a premium subscription.</p>
        <button id="gitsum-subscribe" class="gitsum-button">Subscribe Now</button>
      </div>
      <div id="gitsum-loading" class="gitsum-loading" style="display: none;">
        <p>Analyzing repository...</p>
        <div class="gitsum-spinner"></div>
      </div>
      <div id="gitsum-input-container" class="gitsum-input-container">
        <textarea id="gitsum-input" class="gitsum-input" placeholder="Ask about this repository..."></textarea>
        <button id="gitsum-send" class="gitsum-send-btn">Send</button>
      </div>
    </div>
  `

  return sidebar
}

// Add message to chat
function addMessage(content, isUser = false) {
  const messagesContainer = document.getElementById("gitsum-messages")
  const messageElement = document.createElement("div")
  messageElement.className = isUser ? "gitsum-message gitsum-user-message" : "gitsum-message gitsum-ai-message"

  // Handle markdown formatting
  if (!isUser) {
    const formattedContent = content
      .replace(/```([^`]+)```/g, "<pre><code>$1</code></pre>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .split("\n")
      .join("<br>")

    messageElement.innerHTML = formattedContent
  } else {
    messageElement.textContent = content
  }

  messagesContainer.appendChild(messageElement)
  messagesContainer.scrollTop = messagesContainer.scrollHeight

  // Add to chat history
  chatHistory.push({
    role: isUser ? "user" : "assistant",
    content,
  })
}

// Process repository
async function processRepo() {
  const repoUrl = getRepoUrl()
  if (!repoUrl) return

  document.getElementById("gitsum-loading").style.display = "flex"

  // Send message to background script
  chrome.runtime.sendMessage({ action: "processRepository", repoUrl }, (response) => {
    document.getElementById("gitsum-loading").style.display = "none"

    if (response && response.data) {
      repoData = response.data

      // Add welcome message
      addMessage("👋 Hello! I've analyzed this repository and I'm ready to help. What would you like to know about it?")
    } else {
      addMessage("⚠️ I couldn't analyze this repository. Please try again later.")
    }
  })
}

// Send message to LLM
async function sendMessage() {
  const inputElement = document.getElementById("gitsum-input")
  const message = inputElement.value.trim()

  if (!message) return

  // Add user message to chat
  addMessage(message, true)
  inputElement.value = ""

  document.getElementById("gitsum-loading").style.display = "flex"

  // Send message to background script
  chrome.runtime.sendMessage(
    {
      action: "sendMessage",
      repoData,
      message,
      history: chatHistory,
    },
    (response) => {
      document.getElementById("gitsum-loading").style.display = "none"

      if (response && response.response) {
        addMessage(response.response.message)
      } else {
        addMessage("⚠️ I couldn't get a response. Please try again.")
      }
    },
  )
}

// Check subscription status
async function checkSubscription() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "checkSubscription" }, (response) => {
      const isPremium = response && response.isPremium
      resolve(isPremium)
    })
  })
}

// Initialize sidebar
async function initSidebar() {
  if (sidebarInjected) return

  const isPremium = await checkSubscription()

  // Create toggle button
  const toggleButton = document.createElement("button")
  toggleButton.id = "gitsum-toggle"
  toggleButton.className = "gitsum-toggle-btn"
  toggleButton.innerHTML = "GITSUM"
  document.body.appendChild(toggleButton)

  // Create sidebar
  const sidebar = createSidebar()
  document.body.appendChild(sidebar)

  // Show subscription notice if not premium
  if (!isPremium) {
    document.getElementById("gitsum-subscription-notice").style.display = "flex"
    document.getElementById("gitsum-input-container").style.display = "none"
  } else {
    // Process repository for premium users
    processRepo()
  }

  // Add event listeners
  toggleButton.addEventListener("click", () => {
    sidebar.classList.toggle("gitsum-sidebar-open")
  })

  document.getElementById("gitsum-close").addEventListener("click", () => {
    sidebar.classList.remove("gitsum-sidebar-open")
  })

  document.getElementById("gitsum-send").addEventListener("click", sendMessage)

  document.getElementById("gitsum-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  document.getElementById("gitsum-subscribe").addEventListener("click", () => {
    window.open("https://gitsum.com/subscribe", "_blank")
  })

  sidebarInjected = true
}

// Initialize when DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (isGitHubRepo()) {
      initSidebar()
    }
  })
} else {
  if (isGitHubRepo()) {
    initSidebar()
  }
}

// Listen for navigation events (for SPA navigation)
let lastUrl = location.href
new MutationObserver(() => {
  const url = location.href
  if (url !== lastUrl) {
    lastUrl = url
    if (isGitHubRepo()) {
      if (!sidebarInjected) {
        initSidebar()
      } else {
        // Reset chat for new repository
        document.getElementById("gitsum-messages").innerHTML = ""
        chatHistory = []
        processRepo()
      }
    }
  }
}).observe(document, { subtree: true, childList: true })
