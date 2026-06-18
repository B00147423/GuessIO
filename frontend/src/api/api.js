import { API_BASE_URL } from "../config.js";

export async function getLoginUrl() {
  const res = await fetch(`${API_BASE_URL}/auth/login_url`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`login_url failed: ${res.status}`);
  }
  return res.json();
}

export async function spawnBot(userId, roomId) {
  const qs = roomId ? `?room_id=${encodeURIComponent(roomId)}` : "";
  const res = await fetch(`${API_BASE_URL}/spawn_bot/${userId}${qs}`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

export async function stopBot(userId) {
  const res = await fetch(`${API_BASE_URL}/stop_bot/${userId}`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}
