export async function getLoginUrl() {
  const res = await fetch("http://localhost:8000/auth/login_url", {
    credentials: "include"
  });
  return res.json();
}

export async function spawnBot(userId) {
  const res = await fetch(`http://localhost:8000/spawn_bot/${userId}`, {
    method: "POST",
    credentials: "include"
  });
  return res.json();
}

export async function stopBot(userId) {
  const res = await fetch(`http://localhost:8000/stop_bot/${userId}`, {
    method: "POST",
    credentials: "include"
  });
  return res.json();
}
