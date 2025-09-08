import state from "../state.js";

export function renderPlayers() {
  const ul = document.getElementById("players");
  const playerCount = document.getElementById("playerCount");
  
  // Clear existing players
  ul.innerHTML = "";
  
  // Hardcoded players for testing
  // const testPlayers = [
  //   "itsb3ka", "viewer123", "gamer456", "artist789", "drawer101", 
  //   "player202", "sketcher303", "creator404", "designer505", "painter606",
  //   "skribbler707", "gartic808", "drawing909", "canvas101", "brush202",
  //   "color303", "pixel404", "art505", "sketch606", "doodle707"
  // ];
  
  // // Add test players to state for demo
  // testPlayers.forEach(player => {
  //   if (!state.players.has(player)) {
  //     state.players.add(player);
  //   }
  // });
  
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
