import tmi from "tmi.js";
import type { GameProtocol } from "./gameProtocol.js";
import type { GameServer } from "./gameServer.ts";

function normalizeChannelKey(channel: string): string {
  return channel.startsWith("#") ? channel : `#${channel}`;
}

export class TwitchBotManager {
  private bots = new Map<string, tmi.Client>();
  private gameProtocol: GameProtocol | null = null;

  constructor(private readonly server: GameServer) {}

  setGameProtocol(protocol: GameProtocol): void {
    this.gameProtocol = protocol;
  }

  spawnBot(oauth: string, nick: string, channel: string): boolean {
    const key = normalizeChannelKey(channel);
    if (this.bots.has(key)) {
      console.log(`[WARN] Bot for ${key} already exists`);
      return false;
    }

    const channelName = key.replace(/^#/, "");
    const token = oauth.startsWith("oauth:") ? oauth : `oauth:${oauth}`;

    const client = new tmi.Client({
      options: { debug: false },
      connection: { secure: true, reconnect: true },
      identity: { username: nick, password: token },
      channels: [channelName],
    });

    client.on("connected", () => {
      console.log(`[INFO] Bot connected to ${key}`);
      this.server.onTwitchStatus({
        type: "status",
        status: "ok",
        message: "Bot connected to Twitch IRC",
        channel: key,
      });
    });

    client.on("message", (_channel, tags, message, self) => {
      if (self) return;
      const username = tags["display-name"] ?? tags.username ?? "unknown";
      if (this.gameProtocol) {
        this.gameProtocol.handleCommand(username, message, key);
      }
    });

    client.on("disconnected", (reason) => {
      console.log(`[INFO] Bot disconnected from ${key}:`, reason);
    });

    client.connect().catch((err) => {
      console.error(`[ERROR] Twitch connect failed for ${key}:`, err);
      this.bots.delete(key);
    });

    this.bots.set(key, client);
    console.log(`[INFO] Bot spawned for ${key}`);
    return true;
  }

  stopBot(channel: string): void {
    const key = normalizeChannelKey(channel);
    const client = this.bots.get(key);
    if (!client) {
      console.log(`[WARN] No bot for ${key}`);
      return;
    }
    client.disconnect();
    this.bots.delete(key);
    console.log(`[INFO] Stopped bot for ${key}`);
  }

  setCurrentRoom(channel: string, _roomName: string): void {
    const key = normalizeChannelKey(channel);
    if (!this.bots.has(key)) {
      console.log(`[WARN] No bot for ${key} when setting room`);
    }
  }
}
