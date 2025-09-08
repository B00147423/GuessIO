import state from "./state.js";
import { getLoginUrl, spawnBot, stopBot } from "./api/api.js";

console.log("app.js loaded!");

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  // ✅ Handle Twitch redirect at /auth/callback or /
  if (window.location.pathname === "/auth/callback" && params.has("code")) {
    // Rewrite URL back to root so SPA can continue
    window.history.replaceState({}, document.title, "/");
  } else if (params.has("code")) {
    // Clean up ?code=... if we’re already at /
    window.history.replaceState({}, document.title, "/");
  }

  checkAuthStatus();
});

// Get API base URL from environment or default to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function checkAuthStatus() {
  try {
    console.log("Checking auth status...");
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include"
    });
    const data = await res.json();
    console.log("Auth response:", data);

    if (data.status === "ok") {
      state.user = data.user;
      console.log("Login successful, redirecting to main menu...");
      // Redirect to main menu after successful login
      window.location.href = "/mainMenu.html";
    } else {
      console.log("Not logged in, showing login section");
      // Login section is already visible by default
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    // Login section is already visible by default
  }
}

// This function is no longer needed in the login page
// Game initialization will happen in game.js

// ✅ Login
const twitchLoginBtn = document.getElementById("twitchLoginBtn");
if (twitchLoginBtn) {
  twitchLoginBtn.addEventListener("click", async () => {
    console.log("Twitch login button clicked!");
    try {
      console.log("Getting login URL...");
      const data = await getLoginUrl();
      console.log("Login URL received:", data);
      window.location.href = data.url;
    } catch (error) {
      console.error("Error getting login URL:", error);
    }
  });
}

// ✅ Logout - redirect to login page
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (state.user) {
      await stopBot(state.user.id);
      state.user = null;
    }
    // Stay on login page
    window.location.reload();
  });
}
