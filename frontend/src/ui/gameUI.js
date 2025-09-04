import state from "../state.js";

export function renderPlayers() {
  const ul = document.getElementById("players");
  ul.innerHTML = "";
  state.players.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    ul.appendChild(li);
  });
}
