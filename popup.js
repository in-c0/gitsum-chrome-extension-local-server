// Popup script for handling user authentication and subscription status
document.addEventListener("DOMContentLoaded", () => {
  const loginContainer = document.getElementById("login-container")
  const userContainer = document.getElementById("user-container")
  const subscriptionStatus = document.getElementById("subscription-status")
  const loginBtn = document.getElementById("login-btn")
  const logoutBtn = document.getElementById("logout-btn")
  const subscribeBtn = document.getElementById("subscribe-btn")

  // Check if user is logged in
  chrome.storage.local.get(["token", "user"], (result) => {
    if (result.token && result.user) {
      // User is logged in
      loginContainer.style.display = "none"
      userContainer.style.display = "block"

      // Display user info
      const user = result.user

      // Check subscription status
      chrome.runtime.sendMessage({ action: "checkSubscription" }, (response) => {
        if (response && response.isPremium) {
          subscriptionStatus.className = "status premium"
          subscriptionStatus.innerHTML = `
            <strong>Premium Subscription</strong>
            <p>You have full access to GITSUM features.</p>
          `
        } else {
          subscriptionStatus.className = "status free"
          subscriptionStatus.innerHTML = `
            <strong>Free Account</strong>
            <p>Upgrade to premium for full access to GITSUM features.</p>
          `
          subscribeBtn.style.display = "block"
        }
      })
    }
  })

  // Login button click handler
  loginBtn.addEventListener("click", () => {
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    if (!email || !password) {
      alert("Please enter both email and password")
      return
    }

    // Send login request
    fetch("https://api.gitsum.com/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Login failed")
        }
        return response.json()
      })
      .then((data) => {
        // Save token and user info
        chrome.storage.local.set(
          {
            token: data.token,
            user: data.user,
          },
          () => {
            // Refresh popup
            location.reload()
          },
        )
      })
      .catch((error) => {
        alert("Login failed: " + error.message)
      })
  })

  // Logout button click handler
  logoutBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["token", "user"], () => {
      // Refresh popup
      location.reload()
    })
  })

  // Subscribe button click handler
  subscribeBtn.addEventListener("click", () => {
    window.open("https://gitsum.com/subscribe", "_blank")
  })
})
