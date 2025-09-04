import state from "./state.js";
import { connectWebSocket } from "./ws.js";
import { spawnBot } from "./api/api.js";
import { clearCanvas, setAllStrokes } from "./drawing.js";

document.addEventListener("DOMContentLoaded", () => {
  // Get room info from URL parameters
  const params = new URLSearchParams(window.location.search);
  const roomType = params.get('type');
  const roomCode = params.get('room');
  const theme = params.get('theme'); // Get theme from URL
  
  if (!roomCode) {
    alert("No room code provided!");
    window.location.href = "/mainMenu.html";
    return;
  }
  
  // Set room name
  document.getElementById("roomName").textContent = `Room: ${roomCode}`;
  
  // Display room info
  if (roomType === 'create') {
      document.getElementById("roomName").textContent = `Streamer Room: ${roomCode}`;
      if (theme) {
          document.getElementById("roomName").textContent += ` | Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
      }
  } else {
      document.getElementById("roomName").textContent = `Joined Room: ${roomCode}`;
  }
  
  // Check if user is logged in
  checkAuthStatus();
  
  // Set up event listeners
  setupEventListeners();
});

async function checkAuthStatus() {
  try {
    const res = await fetch("http://localhost:8000/auth/me", {
      credentials: "include"
    });
    const data = await res.json();

    if (data.status === "ok") {
      state.user = data.user;
      
      // Spawn bot when game starts (only for streamer/room creator)
      const params = new URLSearchParams(window.location.search);
      const roomType = params.get('type');
      
      if (roomType === 'create') {
        console.log("[GAME] Spawning bot for streamer...");
        spawnBot(state.user.username).then(res => console.log("[SPAWN BOT]", res));
      }
      
      // Connect to WebSocket and join the room
      state.ws = connectWebSocket(state.user);
    } else {
      // Not logged in, redirect to login page
      window.location.href = "/";
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/";
  }
}

function setupEventListeners() {
  // Back to Menu button
  document.getElementById("backToMenuBtn").addEventListener("click", async () => {
    // Clean up current room state
    console.log("[GAME] Cleaning up room state...");
    
    // Clear the canvas and stroke history
    if (typeof clearCanvas === 'function') {
      clearCanvas();
    }
    
    // Clear player list
    state.players.clear();
    
    // Clear stroke history
    if (typeof setAllStrokes === 'function') {
      setAllStrokes([]);
    }
    
    // Close WebSocket connection
    if (state.ws) {
      console.log("[GAME] Closing WebSocket connection...");
      state.ws.close();
      state.ws = null;
    }
    
    // Stop bot if user was the streamer
    const params = new URLSearchParams(window.location.search);
    const roomType = params.get('type');
    
    if (roomType === 'create' && state.user) {
      console.log("[GAME] Stopping bot for streamer...");
      try {
        await fetch(`http://localhost:8000/api/bot/stop/${state.user.username}`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (err) {
        console.error("Failed to stop bot:", err);
      }
    }
    
    console.log("[GAME] Room cleanup complete, redirecting to main menu...");
    window.location.href = "/mainMenu.html";
  });
  
  // Clear Canvas button
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (state.ws) {
      const params = new URLSearchParams(window.location.search);
      const roomCode = params.get('room');
      state.ws.send(JSON.stringify({
        type: "clear",
        room: roomCode
      }));
    }
  });
  
  // Undo button
  document.getElementById("undoBtn").addEventListener("click", () => {
    if (state.ws) {
      const params = new URLSearchParams(window.location.search);
      const roomCode = params.get('room');
      state.ws.send(JSON.stringify({
        type: "undo",
        room: roomCode
      }));
    }
  });
  
  // Brush size buttons
  document.querySelectorAll('.brush-size').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('.brush-size').forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Set line width
      const size = parseInt(btn.dataset.size);
      const canvas = document.getElementById("draw");
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = size;
    });
  });
  
  // Color picker
  document.getElementById("colorPicker").addEventListener("input", (e) => {
    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = e.target.value;
  });
  
  // Set up canvas drawing
  setupCanvasDrawing();
}

function setupCanvasDrawing() {
  const canvas = document.getElementById("draw");
  const ctx = canvas.getContext("2d");
  
  // Set initial drawing properties
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000000";
  
  let drawing = false;
  
  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    ctx.beginPath();
    sendStroke("start", e);
  });
  
  canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
    sendStroke("end");
  });
  
  canvas.addEventListener("mouseleave", () => {
    drawing = false;
    ctx.beginPath();
    sendStroke("end");
  });
  
  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    sendStroke("draw", { x, y, color: ctx.strokeStyle });
  });
}

function sendStroke(action, payload) {
  if (!state.ws) return;
  
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');
  
  state.ws.send(JSON.stringify({
    type: "draw",
    room: roomCode,
    payload: { action, ...payload }
  }));
}

// Function to get a word based on theme
async function getWordByTheme(theme) {
    try {
        const response = await fetch(`http://localhost:8000/words/theme/${theme}`);
        if (response.ok) {
            const wordData = await response.json();
            return wordData.word;
        } else {
            console.error('Failed to get word:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error getting word:', error);
        return null;
    }
}

// Function to start a new round with theme-based word
async function startNewRound() {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme');
    if (theme) {
        const word = await getWordByTheme(theme);
        if (word) {
            console.log(`[GAME] Starting round with ${theme} theme word: ${word}`);
            // Here you would integrate with your C++ server to start the round
            // For now, just log the word
        }
    }
}
