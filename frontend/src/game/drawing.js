import state from "../state.js";

const CANVAS_W = 1280;
const CANVAS_H = 720;

let canvas = null;
let ctx = null;
let allStrokes = [];
let bitmapInitialized = false;

function ensureCanvas() {
  if (!canvas) {
    canvas = document.getElementById("draw");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";
  }
  return true;
}

function ensureBitmapSize() {
  if (!ensureCanvas() || bitmapInitialized) return;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  bitmapInitialized = true;
}

export function canvasCoords(e) {
  if (!ensureCanvas()) return { x: 0, y: 0 };
  ensureBitmapSize();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

/** Keeps a fixed drawing bitmap; CSS scales the element — avoids layout-phase resize jumps. */
export function fitCanvasToContainer() {
  ensureBitmapSize();
}

export function replayStroke(strokeData) {
  if (!ensureCanvas()) return;
  ensureBitmapSize();

  allStrokes.push(strokeData);
  const payload = strokeData.payload ?? strokeData;

  if (payload?.action === "start") {
    ctx.beginPath();
    if (payload.color) ctx.strokeStyle = payload.color;
    if (payload.width) ctx.lineWidth = payload.width;
    if (payload.x !== undefined && payload.y !== undefined) {
      ctx.moveTo(payload.x, payload.y);
    }
  } else if (payload?.action === "draw") {
    if (payload.color) ctx.strokeStyle = payload.color;
    if (payload.width) ctx.lineWidth = payload.width;
    if (payload.x !== undefined && payload.y !== undefined) {
      ctx.lineTo(payload.x, payload.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(payload.x, payload.y);
    }
  }
}

export function redrawAllStrokes() {
  if (!ensureCanvas()) return;
  ensureBitmapSize();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const saved = [...allStrokes];
  allStrokes = [];
  saved.forEach((stroke) => replayStroke(stroke));
}

export function clearCanvas() {
  if (!ensureCanvas()) return;
  ensureBitmapSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  allStrokes = [];
}

export function clearAllState() {
  clearCanvas();
}

export function setAllStrokes(strokes) {
  allStrokes = strokes || [];
  redrawAllStrokes();
}

export function initDrawing(sendStrokeFn) {
  if (!ensureCanvas()) return;
  ensureBitmapSize();

  let drawing = false;

  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    const { x, y } = canvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    sendStrokeFn("start", e);
  });

  canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
    sendStrokeFn("end");
  });

  canvas.addEventListener("mouseleave", () => {
    drawing = false;
    ctx.beginPath();
    sendStrokeFn("end");
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const { x, y } = canvasCoords(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    sendStrokeFn("draw", e);
  });

  return { canvas, ctx };
}

export function getDrawContext() {
  ensureCanvas();
  ensureBitmapSize();
  return ctx;
}
