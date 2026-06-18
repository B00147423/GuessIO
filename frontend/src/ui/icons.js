/** Google Material Symbols names — https://fonts.google.com/icons */
const GLYPHS = {
  palette: "palette",
  lock: "lock",
  zap: "bolt",
  target: "sports_score",
  video: "videocam",
  lightbulb: "lightbulb",
  flag: "flag",
  check: "check",
  message: "chat",
  trophy: "emoji_events",
  camera: "photo_camera",
  "log-out": "logout",
  sparkles: "auto_awesome",
  utensils: "restaurant",
  paw: "pets",
  gamepad: "sports_esports",
  film: "movie",
  music: "music_note",
  shuffle: "shuffle",
};

const TWITCH_SVG = `<svg class="icon-twitch-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.571 4.714h1.715v5.143L18.567 9.714V2.286H5.433v15.428h4.572v-3.429h1.143L12 17.714h3.429l-3.858-5.143 3.858-5.143H12l-1.858 2.471V4.714z"/></svg>`;

/** @param {string} name @param {string} className */
export function icon(name, className = "material-symbols-outlined icon") {
  if (name === "twitch") {
    return `<span class="${className} icon--twitch" aria-hidden="true">${TWITCH_SVG}</span>`;
  }
  const glyph = GLYPHS[name] ?? name.replace(/-/g, "_");
  return `<span class="${className}" aria-hidden="true">${glyph}</span>`;
}

/** @param {ParentNode} [root] */
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.dataset.icon;
    if (!name) return;
    const extra = [...el.classList].filter((c) => c !== "icon").join(" ");
    const className = `material-symbols-outlined icon ${extra}`.trim();
    el.outerHTML = icon(name, className);
  });
}
