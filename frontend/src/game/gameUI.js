import state from "../state.js";

export function renderPlayers() {
  const ul = document.getElementById("players");
  const playerCount = document.getElementById("playerCount");
  
  // Clear existing players
  ul.innerHTML = "";
  // Update player count
  if (playerCount) {
    const count = state.players.size;
    playerCount.textContent = `${count} player${count !== 1 ? 's' : ''}`;
  }
  
  // Add each player
  state.players.forEach((username) => {
    const li = document.createElement("li");
    li.textContent = username;
    li.title = `Player: ${username}`;
    if (username.toLowerCase() === state.user?.username?.toLowerCase()) {
      li.textContent = `★ ${username}`;
    }
    ul.appendChild(li);
  });
  
  // Show empty state if no players
  if (state.players.size === 0) {
    const li = document.createElement("li");
    li.textContent = "No players yet";
    li.style.color = "rgba(255, 255, 255, 0.5)";
    li.style.fontStyle = "italic";
    li.style.textAlign = "center";
    ul.appendChild(li);
  }
}
