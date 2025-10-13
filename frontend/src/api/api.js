// Get API base URL from environment or default to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function getLoginUrl() {
  const res = await fetch(`${API_BASE_URL}/auth/login_url`, {
    credentials: "include"
  });
  return res.json();
}

export async function spawnBot(userId, roomId) {
  const res = await fetch(`${API_BASE_URL}/spawn_bot/${userId}?room_id=${roomId}`, {
    method: "POST",
    credentials: "include"
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
