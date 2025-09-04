import state from "./state.js";
import { spawnBot, stopBot } from "./api/api.js";

// Cache auth status to avoid repeated API calls
let authCheckPromise = null;
let lastAuthCheck = 0;
const AUTH_CACHE_DURATION = 30000; // 30 seconds

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in, if not redirect to login
  checkAuthStatus();
  
  // Set up event listeners
  setupEventListeners();
});

async function checkAuthStatus() {
  const now = Date.now();
  
  // Use cached auth status if recent
  if (authCheckPromise && (now - lastAuthCheck) < AUTH_CACHE_DURATION) {
    return authCheckPromise;
  }
  
  // Create new auth check promise
  authCheckPromise = performAuthCheck();
  lastAuthCheck = now;
  
  try {
    await authCheckPromise;
  } catch (error) {
    console.error("Auth check failed:", error);
    window.location.href = "/";
  }
}

async function performAuthCheck() {
  try {
    const res = await fetch("http://localhost:8000/auth/me", {
      credentials: "include"
    });
    const data = await res.json();

    if (data.status === "ok") {
      state.user = data.user;
      displayUserInfo();
      // Bot will be spawned when game starts, not here
    } else {
      // Not logged in, redirect to login page
      window.location.href = "/";
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/";
  }
}

function displayUserInfo() {
  const userAvatar = document.getElementById("userAvatar");
  const userWelcomeText = document.getElementById("userWelcomeText");
  
  if (state.user) {
    userAvatar.src = state.user.profile_image || "/default-avatar.png";
    userWelcomeText.textContent = `Welcome, ${state.user.username}!`;
  }
}

function setupEventListeners() {
  console.log("[SETUP] Setting up event listeners...");
  
  // Create Room button - shows theme selection
  document.getElementById("createRoomBtn").addEventListener("click", () => {
    console.log("[SETUP] Create room button clicked");
    if (state.user) {
      showThemeSelection();
    }
  });

  // Join Room button - COMMENTED OUT IN HTML
  // document.getElementById("joinRoomBtn").addEventListener("click", () => {
  //   console.log("[SETUP] Join room button clicked");
  //   const roomCode = document.getElementById("roomCodeInput").value.trim();
  //   if (roomCode) {
  //     window.location.href = `/game.html?type=join&room=${roomCode.toLowerCase()}`;
  //   } else {
  //     alert("Please enter a room code!");
  //   }
  // });

  // Leaderboard button
  document.getElementById("leaderboardBtn").addEventListener("click", () => {
    console.log("[SETUP] Leaderboard button clicked");
    // TODO: Implement leaderboard functionality
    alert("Leaderboard coming soon!");
  });

  // Settings button
  document.getElementById("settingsBtn").addEventListener("click", () => {
    console.log("[SETUP] Settings button clicked");
    // TODO: Implement settings functionality
    alert("Settings coming soon!");
  });

  // Logout button
  console.log("[SETUP] Setting up logout button...");
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    console.log("[SETUP] Logout button found, adding event listener");
    logoutBtn.addEventListener("click", () => {
      console.log("[LOGOUT] Button clicked - starting logout");
      
      // Clear frontend state immediately
      state.user = null;
      authCheckPromise = null;
      lastAuthCheck = 0;
      
      // Try backend logout but don't wait for it
      fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include"
      }).catch(err => console.log("Backend logout failed:", err));
      
      // Redirect immediately
      console.log("[LOGOUT] Redirecting to login page");
      window.location.href = "/";
    });
    console.log("[SETUP] Logout event listener added successfully");
  } else {
    console.error("[SETUP] Logout button not found!");
  }
  
  console.log("[SETUP] All event listeners set up");
}

function showThemeSelection() {
  const themes = [
    { id: 'anime', name: 'Anime', icon: '🎌' },
    { id: 'food', name: 'Food', icon: '🍕' },
    { id: 'animals', name: 'Animals', icon: '🐕' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' },
    { id: 'movies', name: 'Movies', icon: '🎬' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'random', name: 'Random', icon: '🎲' }
  ];

  // Create simple theme selection popup
  const popup = document.createElement('div');
  popup.className = 'theme-popup';
  popup.innerHTML = `
    <div class="theme-popup-content">
      <h3>Pick a Theme</h3>
      <div class="theme-grid">
        ${themes.map(theme => `
          <div class="theme-option" data-theme="${theme.id}">
            <div class="theme-icon">${theme.icon}</div>
            <div class="theme-name">${theme.name}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary" id="cancelTheme">Cancel</button>
    </div>
  `;

  document.body.appendChild(popup);

  // Add event listeners
  popup.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener("click", () => {
      const theme = option.dataset.theme;
      
      // Generate truly unique room ID with multiple random components
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 6);
      const random2 = Math.floor(Math.random() * 1000);
      const roomCode = `${theme}-${timestamp}-${random1}-${random2}`;
      
      console.log("=== ROOM CREATION DEBUG ===");
      console.log("[ROOM] Creating NEW room:");
      console.log("[ROOM] Theme:", theme);
      console.log("[ROOM] User:", state.user.username);
      console.log("[ROOM] Timestamp:", timestamp);
      console.log("[ROOM] Random1:", random1);
      console.log("[ROOM] Random2:", random2);
      console.log("[ROOM] Final Unique ID:", roomCode);
      console.log("[ROOM] Full URL:", `/game.html?type=create&room=${roomCode}&theme=${theme}`);
      console.log("=== END DEBUG ===");
      
      // Force redirect to new room
      window.location.href = `/game.html?type=create&room=${roomCode}&theme=${theme}`;
      document.body.removeChild(popup);
    });
  });

  popup.querySelector('#cancelTheme').addEventListener("click", () => {
    document.body.removeChild(popup);
  });
}
