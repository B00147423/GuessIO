import state from "../state.js";
import { hydrateIcons } from "../ui/icons.js";
import { connectWebSocket } from "./ws.js";
import { spawnBot } from "../api/api.js";
import { registerActiveRoom, deactivateActiveRoom } from "../api/rooms.js";
import { getStreamStatus } from "../api/twitch.js";
import { clearCanvas, setAllStrokes, canvasCoords } from "./drawing.js";
import { showConfirmDialog } from "../ui/dialog.js";
import { API_BASE_URL } from "../config.js";
import { fetchCurrentUser } from "../api/session.js";
import {
  enterChoosingPhase,
  enterDrawingPhase,
  runRoundCountdown,
  onRoundEnded,
  bindToolListeners,
  updateRoundIndicator,
  loadWordChoices,
  initGameLayout,
  getMaxRounds,
} from "./phases.js";

document.addEventListener("DOMContentLoaded", async () => {
  hydrateIcons();
  const roomCode = new URLSearchParams(window.location.search).get("room");
  if (!roomCode) {
    alert("No room code provided!");
    window.location.href = "/";
    return;
  }

  updateRoundIndicator();
  initGameLayout();

  const authed = await checkAuthStatus();
  if (!authed) return;

  bindToolListeners(
    () => sendRoomMessage("clear"),
    () => sendRoomMessage("undo"),
  );

  document.getElementById("backToMenuBtn").addEventListener("click", onLeaveRoom);

  window.addEventListener("guessio:round-start", async () => {
    const isStreamer = new URLSearchParams(window.location.search).get("type") === "create";
    if (!isStreamer) {
      await runRoundCountdown();
    }
    enterDrawingPhase(sendStroke);
  });

  window.addEventListener("guessio:round-end", async () => {
    pickingWord = false;
    const gameComplete = onRoundEnded();
    if (gameComplete) {
      await showGameComplete();
      return;
    }
    loadWordChoicesAndBind();
  });

  window.addEventListener("guessio:connected", () => {
    enterChoosingPhase();
    loadWordChoicesAndBind();
  });

  window.addEventListener("guessio:state-active-round", () => {
    enterDrawingPhase(sendStroke);
  });
});

function loadWordChoicesAndBind() {
  loadWordChoices(pickWordAndStartRound);
}

async function checkAuthStatus() {
  const user = await fetchCurrentUser();
  if (!user) {
    alert("Please log in with Twitch first.");
    window.location.replace("/");
    return false;
  }

  state.user = user;

  const params = new URLSearchParams(window.location.search);
  const roomType = params.get("type");
  const roomCode = params.get("room");
  const theme = params.get("theme") || "gaming";

  state.ws = connectWebSocket(state.user);

  if (roomType === "create" && roomCode) {
    registerActiveRoom({ name: roomCode, theme }).catch(() => {});
    spawnBot(state.user.id, roomCode).catch(() => {});
    startLiveIndicator(state.user.username);
  }

  return true;
}

function sendRoomMessage(type) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  const roomCode = new URLSearchParams(window.location.search).get("room");
  state.ws.send(JSON.stringify({ type, room: roomCode }));
}

function sendStroke(action, e) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

  const roomCode = new URLSearchParams(window.location.search).get("room");
  const ctx = document.getElementById("draw")?.getContext("2d");
  const payload = { action };

  if (e && ctx && (action === "start" || action === "draw")) {
    const { x, y } = canvasCoords(e);
    payload.x = x;
    payload.y = y;
    payload.color = ctx.strokeStyle;
    payload.width = ctx.lineWidth;
  }

  state.ws.send(JSON.stringify({ type: "draw", room: roomCode, payload }));
}

let pickingWord = false;

async function pickWordAndStartRound(word) {
  if (pickingWord) return;

  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    alert("Not connected to game server yet. Wait a moment and try again.");
    return;
  }

  pickingWord = true;

  const container = document.getElementById("wordChoices");
  container?.querySelectorAll("button").forEach((btn) => {
    btn.disabled = true;
  });

  await runRoundCountdown();

  const roomCode = new URLSearchParams(window.location.search).get("room");

  state.ws.send(JSON.stringify({
    type: "start_round",
    room: roomCode,
    payload: { word: word.toLowerCase() },
  }));

  enterDrawingPhase(sendStroke);
  pickingWord = false;
}

async function showGameComplete() {
  enterChoosingPhase();
  const leave = await showConfirmDialog(
    "Game over!",
    `All ${getMaxRounds()} rounds are done. Great stream!`,
    "Back to lobby",
    "Stay here",
  );
  if (leave) window.location.href = "/";
}

async function onLeaveRoom() {
  const confirmed = await showConfirmDialog(
    "Leave Room",
    "Are you sure you want to leave the room? All players will be disconnected and the session will end.",
    "Leave Room",
    "Cancel",
  );
  if (!confirmed) return;

  clearCanvas();
  state.players.clear();
  setAllStrokes([]);

  if (state.ws) {
    const roomCode = new URLSearchParams(window.location.search).get("room");
    state.ws.send(JSON.stringify({
      type: "leave",
      room: roomCode,
      intentional: true,
    }));
    state.ws.close();
    state.ws = null;
  }

  const roomType = new URLSearchParams(window.location.search).get("type");
  if (roomType === "create" && state.user) {
    fetch(`${API_BASE_URL}/stop_bot/${state.user.id}`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    deactivateActiveRoom();
  }

  window.location.href = "/";
}

const LIVE_POLL_MS = 60_000;
let livePollTimer = null;

function setLiveIndicatorState(live, label) {
  const el = document.getElementById("liveIndicator");
  const text = document.getElementById("liveLabel");
  if (!el || !text) return;
  el.hidden = false;
  el.classList.remove("live-indicator--live", "live-indicator--offline", "live-indicator--checking");
  el.classList.add(live ? "live-indicator--live" : "live-indicator--offline");
  text.textContent = label;
}

async function refreshLiveIndicator(twitchLogin) {
  if (!twitchLogin) return;
  try {
    const status = await getStreamStatus(twitchLogin);
    setLiveIndicatorState(status.live, status.live ? "LIVE" : "OFFLINE");
  } catch {
    setLiveIndicatorState(false, "OFFLINE");
  }
}

function startLiveIndicator(twitchLogin) {
  if (livePollTimer) clearInterval(livePollTimer);
  const el = document.getElementById("liveIndicator");
  if (el) {
    el.hidden = false;
    el.classList.remove("live-indicator--live", "live-indicator--offline");
    el.classList.add("live-indicator--checking");
    document.getElementById("liveLabel").textContent = "…";
  }
  refreshLiveIndicator(twitchLogin);
  livePollTimer = setInterval(() => refreshLiveIndicator(twitchLogin), LIVE_POLL_MS);
}
