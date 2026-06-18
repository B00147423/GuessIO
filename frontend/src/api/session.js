import { API_BASE_URL } from "../config.js";

export async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok && data.status === "ok" && data.user) {
      return data.user;
    }
  } catch {
    // ignore
  }

  return null;
}

export function clearStoredUser() {
  sessionStorage.removeItem("guessio_user");
}
