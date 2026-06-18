import state from "../state.js";
import { API_BASE_URL } from "../config.js";
import { clearStoredUser } from "../api/session.js";
import { hydrateIcons } from "../ui/icons.js";

export function showLobby(user) {
  state.user = user;

  const landing = document.getElementById("landingShell");
  const lobby = document.getElementById("lobbySection");

  if (landing) landing.hidden = true;
  if (lobby) lobby.hidden = false;

  document.body.classList.add("app-lobby");
  document.title = "GuessIO - Streamer Lobby";

  const streamerName = document.getElementById("streamerName");
  const userAvatar = document.getElementById("userAvatar");

  if (streamerName) streamerName.textContent = user.username;
  if (userAvatar) userAvatar.src = user.profile_image || "/default-avatar.png";

  document.getElementById("startBtn")?.addEventListener("click", onStart);
  document.getElementById("logoutBtn")?.addEventListener("click", onLogout);
}

export function showLanding() {
  const landing = document.getElementById("landingShell");
  const lobby = document.getElementById("lobbySection");

  if (landing) landing.hidden = false;
  if (lobby) lobby.hidden = true;

  document.body.classList.remove("app-lobby");
  document.title = "GuessIO - Draw, Guess, Win Live!";
}

function onStart() {
  if (state.user) showThemeSelection();
}

function onLogout() {
  state.user = null;
  clearStoredUser();

  fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});

  showLanding();
}

function showThemeSelection() {
  const themes = [
    { id: "anime", name: "Anime", icon: "sparkles" },
    { id: "food", name: "Food", icon: "utensils" },
    { id: "animals", name: "Animals", icon: "paw" },
    { id: "gaming", name: "Gaming", icon: "gamepad" },
    { id: "movies", name: "Movies", icon: "film" },
    { id: "music", name: "Music", icon: "music" },
    { id: "random", name: "Random", icon: "shuffle" },
  ];

  const roundOptions = [5, 10, 20, 30, 50];

  const popup = document.createElement("div");
  popup.className = "theme-popup";
  popup.innerHTML = `
    <div class="theme-popup-content">
      <h3>Start a game</h3>
      <p class="theme-popup-hint">Pick rounds, then click a theme to start.</p>
      <div class="round-picker">
        <span class="round-picker__label">Rounds</span>
        <div class="round-picker__options" role="group" aria-label="Number of rounds">
          ${roundOptions
            .map(
              (n) => `
            <button type="button" class="round-option${n === 10 ? " round-option--active" : ""}" data-rounds="${n}" aria-pressed="${n === 10}">
              ${n}
            </button>
          `,
            )
            .join("")}
        </div>
        <p class="round-picker__selected"><span id="roundPickerLabel">10</span> rounds selected</p>
      </div>
      <div class="theme-grid">
        ${themes
          .map(
            (theme) => `
          <div class="theme-option" data-theme="${theme.id}">
            <div class="theme-icon" data-icon="${theme.icon}"></div>
            <div class="theme-name">${theme.name}</div>
          </div>
        `,
          )
          .join("")}
      </div>
      <button class="btn btn-secondary" id="cancelTheme">Cancel</button>
    </div>
  `;

  document.body.appendChild(popup);
  hydrateIcons(popup);

  let selectedRounds = 10;

  popup.querySelectorAll(".round-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedRounds = parseInt(btn.dataset.rounds, 10);
      popup.querySelectorAll(".round-option").forEach((b) => {
        b.classList.toggle("round-option--active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      const label = popup.querySelector("#roundPickerLabel");
      if (label) label.textContent = String(selectedRounds);
    });
  });

  popup.querySelectorAll(".theme-option").forEach((option) => {
    option.addEventListener("click", () => {
      const theme = option.dataset.theme;
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 6);
      const random2 = Math.floor(Math.random() * 1000);
      const roomCode = `${theme}-${timestamp}-${random1}-${random2}`;

      window.location.href = `/game.html?type=create&room=${encodeURIComponent(roomCode)}&theme=${encodeURIComponent(theme)}&rounds=${selectedRounds}`;
    });
  });

  popup.querySelector("#cancelTheme").addEventListener("click", () => {
    document.body.removeChild(popup);
  });
}
