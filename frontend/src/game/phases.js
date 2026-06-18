import { clearCanvas, setAllStrokes, initDrawing, getDrawContext, fitCanvasToContainer } from "./drawing.js";
import { API_BASE_URL } from "../config.js";

const ROUND_OPTIONS = [5, 10, 20, 30, 50];

let drawingInitialized = false;
let toolListenersBound = false;
let roundNumber = 1;

export function getMaxRounds() {
  const n = parseInt(new URLSearchParams(window.location.search).get("rounds") || "10", 10);
  return ROUND_OPTIONS.includes(n) ? n : 10;
}

function setBodyPhase(phase) {
  document.body.classList.remove("gartic-choosing", "gartic-countdown", "gartic-drawing");
  if (phase) document.body.classList.add(`gartic-${phase}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initGameLayout() {
  requestAnimationFrame(() => {
    fitCanvasToContainer();
  });
}

export function getRoundNumber() {
  return roundNumber;
}

export function updateRoundIndicator() {
  const el = document.getElementById("roundIndicator");
  if (el) el.textContent = `${roundNumber}/${getMaxRounds()}`;
}

export function enterChoosingPhase() {
  setBodyPhase("choosing");

  const wordDisplay = document.getElementById("wordDisplay");
  if (wordDisplay) {
    wordDisplay.hidden = true;
    wordDisplay.classList.remove("is-revealed");
    wordDisplay.onclick = null;
  }
}

export async function runRoundCountdown() {
  setBodyPhase("countdown");

  const numEl = document.getElementById("countdownNumber");

  for (const n of [3, 2, 1]) {
    if (numEl) {
      numEl.textContent = String(n);
      numEl.classList.remove("is-popping");
      numEl.classList.add("is-popping");
    }
    await delay(1000);
  }

  if (numEl) numEl.classList.remove("is-popping");
}

export function enterDrawingPhase(sendStroke) {
  setBodyPhase("drawing");

  if (!drawingInitialized) {
    fitCanvasToContainer();
    initDrawing(sendStroke);
    drawingInitialized = true;
  }
}

/** @returns {boolean} true when all rounds are finished */
export function onRoundEnded() {
  if (roundNumber >= getMaxRounds()) {
    return true;
  }

  roundNumber += 1;
  updateRoundIndicator();
  clearCanvas();
  setAllStrokes([]);
  enterChoosingPhase();
  return false;
}

export async function fetchWordOptions(theme, count = 2) {
  const words = new Set();
  const fallback = ["glue", "elbow pad", "guitar", "pizza", "dragon", "castle"];

  for (let i = 0; i < 20 && words.size < count; i++) {
    try {
      const res = await fetch(`${API_BASE_URL}/words/theme/${theme}`);
      if (!res.ok) break;
      const data = await res.json();
      if (data.word) words.add(String(data.word).toUpperCase());
    } catch {
      break;
    }
  }

  for (const w of fallback) {
    if (words.size >= count) break;
    words.add(w.toUpperCase());
  }

  return [...words].slice(0, count);
}

export async function loadWordChoices(onPick) {
  const container = document.getElementById("wordChoices");
  if (!container) return;

  const theme = new URLSearchParams(window.location.search).get("theme") || "random";
  container.innerHTML = `<p class="gartic-word-loading">Loading words…</p>`;

  const options = await fetchWordOptions(theme, 2);

  container.innerHTML = "";
  options.forEach((word) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gartic-word-btn";
    btn.innerHTML = `<span class="gartic-word-btn__play" aria-hidden="true">▶</span> ${word}`;
    btn.addEventListener("click", () => onPick(word));
    container.appendChild(btn);
  });
}

export function bindToolListeners(onClear, onUndo) {
  if (toolListenersBound) return;
  toolListenersBound = true;

  const ctx = getDrawContext();
  if (ctx) {
    document.getElementById("brushSize")?.addEventListener("input", (e) => {
      ctx.lineWidth = parseInt(e.target.value, 10);
    });

    function updateStroke() {
      const hex = document.getElementById("colorPicker").value;
      const alpha = parseFloat(document.getElementById("alphaPicker").value);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    document.getElementById("colorPicker")?.addEventListener("input", updateStroke);
    document.getElementById("alphaPicker")?.addEventListener("input", updateStroke);
    updateStroke();
  }

  document.getElementById("clearBtn")?.addEventListener("click", onClear);
  document.getElementById("undoBtn")?.addEventListener("click", onUndo);
}
