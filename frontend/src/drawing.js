import state from "./state.js";

const canvas = document.getElementById("draw");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const clearBtn = document.getElementById("clearBtn");

ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.strokeStyle = "#000000";

let drawing = false;

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
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

  sendStroke("draw", e);
});

colorPicker.addEventListener("input", (e) => {
  ctx.strokeStyle = e.target.value;
});

clearBtn.addEventListener("click", () => {
  if (state.ws) {
    state.ws.send(JSON.stringify({
      type: "clear",
      room: state.user.username.toLowerCase()
    }));
  }
});

function sendStroke(action, e) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');
  
  if (action === "start" || action === "draw") {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    state.ws.send(JSON.stringify({
      type: "draw",
      room: roomCode,
      payload: {
        action: action,
        x: x,
        y: y,
        color: ctx.strokeStyle,
        width: ctx.lineWidth
      }
    }));
  } else if (action === "end") {
    state.ws.send(JSON.stringify({
      type: "draw",
      room: roomCode,
      payload: {
        action: action
      }
    }));
  }
}

// Store all strokes for instant replay
let allStrokes = [];

export function replayStroke(strokeData) {
  // Add the new stroke to our collection
  allStrokes.push(strokeData);
  
  // Draw only the new stroke smoothly
  const payload = strokeData.payload;
  
  if (payload && payload.action === "start") {
    // Start a new path
    ctx.beginPath();
    
    // Set color if available
    if (payload.color) {
      ctx.strokeStyle = payload.color;
    }
    
    // Move to starting position
    if (payload.x !== undefined && payload.y !== undefined) {
      ctx.moveTo(payload.x, payload.y);
    }
  } else if (payload && payload.action === "draw") {
    // Set color if available
    if (payload.color) {
      ctx.strokeStyle = payload.color;
    }
    
    // Draw the line smoothly
    if (payload.x !== undefined && payload.y !== undefined) {
      ctx.lineTo(payload.x, payload.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(payload.x, payload.y);
    }
  }
  // Note: "end" actions don't need special handling
}

export function redrawAllStrokes() {
  // Clear the canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw all strokes at once
  allStrokes.forEach(strokeData => {
    const payload = strokeData.payload;
    
    if (payload && payload.action === "start") {
      // Start a new path
      ctx.beginPath();
      
      // Set color if available
      if (payload.color) {
        ctx.strokeStyle = payload.color;
      }
      
      // Move to starting position
      if (payload.x !== undefined && payload.y !== undefined) {
        ctx.moveTo(payload.x, payload.y);
      }
    } else if (payload && payload.action === "draw") {
      // Set color if available
      if (payload.color) {
        ctx.strokeStyle = payload.color;
      }
      
      // Draw the line
      if (payload.x !== undefined && payload.y !== undefined) {
        ctx.lineTo(payload.x, payload.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(payload.x, payload.y);
      }
    }
    // Note: "end" actions don't need special handling
  });
}

export function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Also clear the stored strokes
  allStrokes = [];
}

export function clearAllState() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Clear stored strokes
  allStrokes = [];
  console.log("[DRAWING] All drawing state cleared");
}

// Function to handle when we get the full state from server
export function setAllStrokes(strokes) {
  allStrokes = strokes || [];
  redrawAllStrokes();
}
