import state from "./state.js";
import { getLoginUrl } from "./api/api.js";
import { fetchCurrentUser } from "./api/session.js";
import { showLobby, showLanding } from "./game/lobby.js";
import { hydrateIcons } from "./ui/icons.js";

function initIcons() {
  hydrateIcons();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIcons);
} else {
  initIcons();
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await fetchCurrentUser();

  if (user) {
    showLobby(user);
  } else {
    showLanding();
  }

  document.querySelectorAll("#twitchLoginBtn, .js-twitch-login").forEach((btn) => {
    btn.addEventListener("click", startTwitchLogin);
  });
});

async function startTwitchLogin() {
  const data = await getLoginUrl();
  if (data?.url) {
    window.location.href = data.url;
  }
}
