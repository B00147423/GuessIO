import { API_BASE_URL } from "../config.js";

/**
 * Ask the backend if a Twitch channel is live.
 * @param {string} login Twitch channel name (state.user.username)
 */
export async function getStreamStatus(login) {
  const res = await fetch(
    `${API_BASE_URL}/api/twitch/stream-status?login=${encodeURIComponent(login)}`
  );
  if (!res.ok) {
    throw new Error(`stream-status failed: ${res.status}`);
  }
  return res.json();
}
