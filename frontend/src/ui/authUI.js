import { initGame } from "../app.js";

export function showLoginSection() {
  document.getElementById("loginSection").style.display = "block";
  document.getElementById("gameSection").style.display = "none";
}

export function showGameSection(user) {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("gameSection").style.display = "block";
  document.getElementById("userInfo").innerHTML =
    `<img src="${user.profile_image}" style="width:40px;height:40px;border-radius:50%;"> 
     <span>Welcome, ${user.username}!</span>`;
  initGame(user);
}
