import { GameServer } from "./gameServer.js";
import { loadConfig, WS_PORT } from "./config.js";

const server = new GameServer();

function shutdown() {
  console.log("Shutting down...");
  server.shutdown().then(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.start(WS_PORT);

const cfg = loadConfig();
if (cfg.oauth && cfg.nick && cfg.channel) {
  const channel = cfg.channel.startsWith("#") ? cfg.channel : `#${cfg.channel}`;
  const oauth = cfg.oauth.startsWith("oauth:") ? cfg.oauth : `oauth:${cfg.oauth}`;
  if (server.spawnBot(oauth, cfg.nick, channel)) {
    console.log(`Twitch bot spawned for ${channel}`);
  }
} else {
  console.log("\n=== Twitch bot not configured ===");
  console.log("Set TWITCH_OAUTH, TWITCH_NICK, TWITCH_CHANNEL or config.json");
  console.log("You can spawn bots later via the API.\n");
}
