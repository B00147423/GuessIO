import state from "../state.js";
import { renderPlayers } from "./gameUI.js";
import { replayStroke, clearCanvas, setAllStrokes, clearAllState } from "./drawing.js";

export function connectWebSocket(user) {
  // Get the actual room code from URL parameters
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');
  
  if (!roomCode) {
    return null;
  }
  
  state.players.clear();
  
  // Don't clear drawing state here - let the server restore it
  // clearAllState();
  
  // Clear any existing WebSocket connection
  if (state.ws) {
    state.ws.close();
  }
  
  const ws = new WebSocket("ws://localhost:9001");

  ws.onopen = () => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");

    ws.send(JSON.stringify({
      type: "join",
      room: roomCode,
      channel: user.username,
      payload: user.username,
    }));

    showEmptyGameFeed();

    setTimeout(() => {
      ws.send(JSON.stringify({ type: "get_state", room: roomCode }));
    }, 300);

    window.dispatchEvent(new CustomEvent("guessio:connected"));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleServerMessage(msg);
  };

  ws.onclose = (event) => {
    if (event.code === 1002) {
      showError("Connection error: Protocol error. Please refresh the page.");
    } else if (event.code === 1003) {
      showError("Connection error: Unsupported data. Please refresh the page.");
    } else if (event.code === 1006) {
      showError("Connection lost! Attempting to reconnect...");
      setTimeout(() => reconnectWebSocket(user), 2000);
    } else if (event.code === 1011) {
      showError("Server error. Please try again later.");
    } else if (event.code === 1012) {
      showError("Server restarting. Attempting to reconnect...");
      setTimeout(() => reconnectWebSocket(user), 3000);
    } else if (event.code === 1013) {
      showError("Server busy. Attempting to reconnect...");
      setTimeout(() => reconnectWebSocket(user), 5000);
    } else if (event.code !== 1000 && event.code !== 1001) {
      showError("Connection error. Please refresh the page.");
    }
  };

  ws.onerror = () => {
    showError("Connection error occurred. Please check your internet connection.");
  };

  return ws;
}

/** Who won the current round (cleared on round end). Used to avoid duplicate timeout message. */
let lastRoundWinner = null;

function clearGameFeed() {
  const el = document.getElementById("guessDisplay");
  if (el) el.innerHTML = "";
}

function appendGameFeed(text, className = "game-feed__line") {
  const el = document.getElementById("guessDisplay");
  if (!el) return;

  const empty = el.querySelector(".game-feed__empty");
  if (empty) empty.remove();

  const line = document.createElement("div");
  line.className = className;
  line.textContent = text;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function showEmptyGameFeed() {
  const el = document.getElementById("guessDisplay");
  if (!el || el.children.length > 0) return;
  const line = document.createElement("div");
  line.className = "game-feed__empty";
  line.textContent = "Round events and winners will show here…";
  el.appendChild(line);
}

function showWordOnPage(word) {
  const wordDisplay = document.getElementById("wordDisplay");
  if (!wordDisplay) return;

  wordDisplay.textContent = word;
  wordDisplay.hidden = false;
  wordDisplay.title = "Click to reveal word";
  wordDisplay.classList.remove("is-revealed");

  wordDisplay.onclick = function () {
    this.classList.add("is-revealed");
    this.title = "Word revealed";
  };
}

function renderScoreDisplay(scores) {
  const scoreDisplay = document.getElementById("scoreDisplay");
  if (!scoreDisplay || !scores) return;

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = entries[0]?.[1] ?? 0;

  scoreDisplay.innerHTML = '<h3 class="score-display__title">Final Scores</h3>';
  for (const [player, score] of entries) {
    const row = document.createElement("div");
    row.className = "score-display__row";
    if (score === topScore && topScore > 0) {
      row.classList.add("score-display__row--leader");
    }
    row.textContent = `${player}: ${score} points`;
    scoreDisplay.appendChild(row);
  }
  scoreDisplay.hidden = false;
}

function handleServerMessage(msg) {
  if (msg.type === "join") {
    let username;
    if (typeof msg.payload === 'string') {
      // Direct username string
      username = msg.payload;
    } else if (msg.payload && msg.payload.username) {
      // Object with username property
      username = msg.payload.username;
    }
    
    if (username) {
      state.players.add(username.toLowerCase());
      renderPlayers();
    }
  }

  else if (msg.type === "leave") {
    const { username } = msg.payload;
    if (username) {
      state.players.delete(username.toLowerCase());
      renderPlayers();
    }
  }

  else if (msg.type === "draw") {
    replayStroke(msg);
  }

  else if (msg.type === "clear") {
    clearCanvas();
  }

  else if (msg.type === "undo") {
    setAllStrokes(msg.payload?.strokes ?? []);
  }

  else if (msg.type === "round_start") {
    handleRoundStart(msg.payload);
  }
  
  else if (msg.type === "guess") {
    handleGuess(msg.payload);
  }
  
  else if (msg.type === "round_end") {
    handleRoundEnd(msg.payload);
  }
  
  else if (msg.type === "current_state") {
    // Restore players
    if (msg.payload.players) {
      state.players.clear();
      msg.payload.players.forEach((player) => {
        state.players.add(String(player).toLowerCase());
      });
      renderPlayers();
    }
    
    // Ensure current user is in the players list
    if (state.user && state.user.username && !state.players.has(state.user.username.toLowerCase())) {
      state.players.add(state.user.username.toLowerCase());
      renderPlayers();
    }
    
    if (msg.payload.strokes && msg.payload.strokes.length > 0) {
      setAllStrokes(msg.payload.strokes);
    } else {
      clearAllState();
    }
    
    if (msg.payload.round && msg.payload.round.active) {
      // Check if this is the streamer (room creator)
      const params = new URLSearchParams(window.location.search);
      const roomType = params.get('type');
      const isStreamer = roomType === 'create';
      
      if (isStreamer) {
        showWordOnPage(msg.payload.round.word);
      }
      
      // Disable start button since round is already active
      window.dispatchEvent(new CustomEvent("guessio:state-active-round"));
      
      // Start the visual timer
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDisplay) {
        let timeLeft = msg.payload.round.timeLeft;
        timerDisplay.textContent = `Time: ${timeLeft}s`;
        timerDisplay.removeAttribute('aria-hidden');
        
        // Clear any existing timer
        if (window.roundTimer) {
          clearInterval(window.roundTimer);
        }
        
        // Start countdown (visual only - server controls actual timing)
        window.roundTimer = setInterval(() => {
          timeLeft--;
          timerDisplay.textContent = `Time: ${timeLeft}s`;
          
          if (timeLeft <= 0) {
            clearInterval(window.roundTimer);
            timerDisplay.textContent = 'Time: 0s';
            // Server will automatically end the round
          }
        }, 1000);
      }
    }
  }
}

// Reconnection function
function reconnectWebSocket(user) {
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

function handleRoundStart(payload) {
  lastRoundWinner = null;
  clearGameFeed();

  const scoreDisplay = document.getElementById("scoreDisplay");
  if (scoreDisplay) {
    scoreDisplay.innerHTML = "";
    scoreDisplay.hidden = true;
  }

  appendGameFeed(
    "Round started — viewers type !guess <word> in Twitch chat!",
    "game-feed__line game-feed__line--system",
  );
  
  const params = new URLSearchParams(window.location.search);
  const roomType = params.get('type');
  const isStreamer = roomType === 'create';
  
  if (isStreamer) {
    showWordOnPage(payload.word || "NO WORD RECEIVED");
  }

  window.dispatchEvent(new CustomEvent("guessio:round-start"));
  
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    let timeLeft = payload.time || 60;
    timerDisplay.textContent = `Time: ${timeLeft}s`;
    timerDisplay.removeAttribute('aria-hidden');
    
    // Clear any existing timer
    if (window.roundTimer) {
      clearInterval(window.roundTimer);
    }
    
    // Start countdown (visual only - server controls actual timing)
    window.roundTimer = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = `Time: ${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(window.roundTimer);
        timerDisplay.textContent = 'Time: 0s';
        // Server will automatically end the round
      }
    }, 1000);
  }
}

function handleGuess(payload) {
  if (!payload.correct) return;

  lastRoundWinner = payload.user;
  const score = payload.score ? ` (+${payload.score} pts)` : "";
  appendGameFeed(
    `@${payload.user} got it right!${score}`,
    "game-feed__line game-feed__line--win",
  );

  showError(`${payload.user} guessed correctly!`, "success");
}

function handleRoundEnd(payload) {
  if (!lastRoundWinner) {
    appendGameFeed(
      `Time's up! The word was: ${payload.word}`,
      "game-feed__line game-feed__line--timeout",
    );
  }
  lastRoundWinner = null;

  // Show final word on streamer panel
  const wordDisplay = document.getElementById('wordDisplay');
  if (wordDisplay) {
    wordDisplay.textContent = `Word was: ${payload.word}`;
    wordDisplay.hidden = false;
    wordDisplay.classList.add('is-revealed');
  }

  renderScoreDisplay(payload.scores);

  window.dispatchEvent(new CustomEvent("guessio:round-end", { detail: payload }));
  
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = '\u00a0';
    timerDisplay.setAttribute('aria-hidden', 'true');
  }
}
