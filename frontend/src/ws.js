import state from "./state.js";
import { renderPlayers } from "./ui/gameUI.js";
import { replayStroke, clearCanvas, setAllStrokes, clearAllState } from "./drawing.js";

export function connectWebSocket(user) {
  // Get the actual room code from URL parameters
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');
  
  if (!roomCode) {
    console.error("[WS] No room code found in URL!");
    return null;
  }
  
  console.log("[WS] Connecting to room:", roomCode);
  
  // Clear all previous state when connecting to a new room
  console.log("[WS] Clearing previous room state...");
  state.players.clear();
  
  // Clear drawing state
  clearAllState();
  
  // Clear any existing WebSocket connection
  if (state.ws) {
    console.log("[WS] Closing existing WebSocket connection...");
    state.ws.close();
  }
  
  const ws = new WebSocket("ws://localhost:9001");

  ws.onopen = () => {
    console.log("Connected to game server");
    console.log("WebSocket readyState:", ws.readyState);
    
    // Show success message only when actually connected
    showError("Connected successfully!", "success");
    
    setTimeout(() => {
      console.log("About to send join...");
      ws.send(JSON.stringify({
        type: "join",
        room: roomCode,
        channel: user.username, // Include channel info
        payload: user.username
      }));
      console.log("join sent!");
      
      setTimeout(() => {
        console.log("About to send get_state...");
        ws.send(JSON.stringify({
          type: "get_state",
          room: roomCode
        }));
        console.log("get_state sent!");
      }, 200);
    }, 100);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("[WS MESSAGE]", msg);
    console.log("[DEBUG] Message type:", msg.type); // ← ADD THIS
    handleServerMessage(msg);
  };

  ws.onclose = (event) => {
    console.log("❌ WebSocket closed with code:", event.code, "reason:", event.reason);
    
    // Handle different close codes
    if (event.code === 1000) {
      console.log("[WS] Normal closure");
    } else if (event.code === 1001) {
      console.log("[WS] Going away");
    } else if (event.code === 1002) {
      console.log("[WS] Protocol error");
      showError("Connection error: Protocol error. Please refresh the page.");
    } else if (event.code === 1003) {
      console.log("[WS] Unsupported data");
      showError("Connection error: Unsupported data. Please refresh the page.");
    } else if (event.code === 1006) {
      console.log("[WS] Abnormal closure");
      showError("Connection lost! Attempting to reconnect...");
      setTimeout(() => reconnectWebSocket(user), 2000);
    } else if (event.code === 1011) {
      console.log("[WS] Server error");
      showError("Server error. Please try again later.");
    } else if (event.code === 1012) {
      console.log("[WS] Service restart");
      showError("Server restarting. Attempting to reconnect...");
      setTimeout(() => reconnectWebSocket(user), 3000);
    } else if (event.code === 1013) {
      console.log("[WS] Try again later");
      showError("Server busy. Attempting to reconnect...");
      setTimeout(() => reconnectWebSocket(user), 5000);
    } else {
      console.log("[WS] Unknown close code:", event.code);
      showError("Connection error. Please refresh the page.");
    }
  };

  ws.onerror = (error) => {
    console.log("❌ WebSocket error:", error);
    showError("Connection error occurred. Please check your internet connection.");
  };

  return ws;
}

function handleServerMessage(msg) {
  if (msg.type === "join") {
    console.log("[DEBUG] Join message received:", msg);
    console.log("[DEBUG] Full payload:", msg.payload);
    
    // Handle both payload formats: direct username or {username: "..."}
    let username;
    if (typeof msg.payload === 'string') {
      // Direct username string (from C++ bot)
      username = msg.payload;
    } else if (msg.payload && msg.payload.username) {
      // Object with username property
      username = msg.payload.username;
    }
    
    console.log("[DEBUG] Extracted username:", username);
    
    if (username) {
      state.players.add(username);
      renderPlayers();
      console.log("[DEBUG] Added player:", username, "Total players:", state.players.size);
    } else {
      console.log("[ERROR] Could not extract username from join message");
    }
  }

  else if (msg.type === "leave") {
    const { username } = msg.payload;
    if (username) {
      state.players.delete(username);
      renderPlayers();
    }
  }

  else if (msg.type === "chat") {
    console.log("[CHAT]", msg.payload);
  }

  else if (msg.type === "draw") {
    replayStroke(msg.payload);
  }

  else if (msg.type === "clear") {
    clearCanvas();
  }

  else if (msg.type === "system") {
    console.log("[SYSTEM]", msg.payload);
  }
  
  // Handle state response - now uses instant drawing
  else if (msg.type === "current_state") {
    console.log("[CURRENT STATE]", msg.payload);
    console.log("[DEBUG] Players count:", msg.payload.players ? msg.payload.players.length : 0);
    console.log("[DEBUG] Strokes count:", msg.payload.strokes ? msg.payload.strokes.length : 0);
    
    // Restore players
    if (msg.payload.players) {
      state.players.clear();
      msg.payload.players.forEach(player => {
        state.players.add(player);
      });
      renderPlayers();
    }
    
    // Restore drawing strokes INSTANTLY
    if (msg.payload.strokes && msg.payload.strokes.length > 0) {
      console.log(`[DEBUG] Setting ${msg.payload.strokes.length} strokes for instant display...`);
      setAllStrokes(msg.payload.strokes);
      console.log(`[DEBUG] All strokes displayed instantly!`);
    } else {
      console.log("[DEBUG] No strokes to restore");
    }
  }
}

// Reconnection function
function reconnectWebSocket(user) {
  console.log("[WS] Attempting to reconnect...");
  showError("Reconnecting...");
  
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  
  // Wait a bit then reconnect
  setTimeout(() => {
    state.ws = connectWebSocket(user);
    // Don't show success message immediately - let the onopen event handle it
  }, 1000);
}

// Show error messages to user
function showError(message, type = "error") {
  // Remove any existing error messages
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.className = `error-message ${type}`;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Set background color based on type
  if (type === "success") {
    errorDiv.style.backgroundColor = "#4CAF50";
  } else {
    errorDiv.style.backgroundColor = "#f44336";
  }
  
  errorDiv.textContent = message;
  
  // Add to page
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
  
  // Add CSS animation
  if (!document.querySelector('#error-styles')) {
    const style = document.createElement('style');
    style.id = 'error-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}
