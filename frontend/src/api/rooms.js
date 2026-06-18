import { API_BASE_URL } from "../config.js";

/**
 * Register the streamer's active room for Twitch extension auto-join.
 * @param {{ name: string, theme: string, language?: string }} room
 */
export async function registerActiveRoom(room) {
  const res = await fetch(`${API_BASE_URL}/api/rooms/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: room.name,
      theme: room.theme,
      language: room.language || "EN",
    }),
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

/** Deactivate the streamer's active room when leaving the game. */
export async function deactivateActiveRoom() {
  try {
    await fetch(`${API_BASE_URL}/api/rooms/active/me`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}
