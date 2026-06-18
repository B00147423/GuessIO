import tmi from "tmi.js";
import type { GameProtocol } from "./gameProtocol.js";
import type { GameServer } from "./gameServer.ts";
import { ChatRateLimiter } from "./chatRateLimiter.js";

function normalizeChannelKey(channel: string): string {
  return channel.startsWith("#") ? channel : `#${channel}`;
}

type SayableClient = tmi.Client & { say(ch: string, msg: string): Promise<[string]> };

export class TwitchBotManager {
  private bots = new Map<string, tmi.Client>();
  private readonly rateLimiters = new Map<string, ChatRateLimiter>();
  private gameProtocol: GameProtocol | null = null;
  private lastNoGameAnnounce = new Map<string, number>();

  constructor(private readonly server: GameServer) {}

  private limiterFor(key: string): ChatRateLimiter {
    let limiter = this.rateLimiters.get(key);
    if (!limiter) {
      limiter = new ChatRateLimiter();
      this.rateLimiters.set(key, limiter);
    }
    return limiter;
  }

  private trySay(client: SayableClient, channel: string, message: string, key: string): void {
    if (!this.limiterFor(key).canSend()) {
      console.log(`[TWITCH] Rate limit — dropped chat message in ${key}`);
      return;
    }
    void client.say(channel, message).catch((err: unknown) => {
      console.error(`[ERROR] Failed to send chat message in ${channel}:`, err);
    });
  }

  setGameProtocol(protocol: GameProtocol): void {
    this.gameProtocol = protocol;
  }

  spawnBot(oauth: string, nick: string, channel: string): boolean {
    const key = normalizeChannelKey(channel);
    if (this.bots.has(key)) {
      console.log(`Bot Manager: Replacing existing bot for ${key}`);
      this.stopBot(channel);
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
      console.log(`Bot Manager: Bot connected to ${key}`);
      this.server.onTwitchStatus({
        type: "status",
        status: "ok",
        message: "Bot connected to Twitch IRC",
        channel: key,
      });
    });

    client.on("message", (channel, tags, message, self) => {
      if (self) return;
      const username = tags["display-name"] ?? tags.username ?? "unknown";
      if (!this.gameProtocol) return;
      const reply = this.gameProtocol.handleCommand(username, message, key, tags);
      if (reply === "NO_GAME_ANNOUNCE") {
        const now = Date.now();
        const last = this.lastNoGameAnnounce.get(key) ?? 0;
        if (now - last >= 60_000) {
          this.lastNoGameAnnounce.set(key, now);
          this.trySay(
            client as SayableClient,
            channel,
            "No GuessIO game open yet — wait for the streamer to start a room.",
            key,
          );
        }
        return;
      }
      if (reply) {
        this.trySay(client as SayableClient, channel, reply, key);
      }
    });

    client.on("disconnected", (reason) => {
      console.log(`[INFO] Bot disconnected from ${key}:`, reason);
      this.bots.delete(key);
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
    this.rateLimiters.delete(key);
    this.lastNoGameAnnounce.delete(key);
    console.log(`[INFO] Stopped bot for ${key}`);
  }

  sayInChannel(channel: string, message: string): void {
    const key = normalizeChannelKey(channel);
    const client = this.bots.get(key);
    if (!client) {
      console.log(`[WARN] No bot to announce in ${key}`);
      return;
    }
    const channelName = key.replace(/^#/, "");
    this.trySay(client as SayableClient, channelName, message, key);
  }

  setCurrentRoom(channel: string, _roomName: string): void {
    const key = normalizeChannelKey(channel);
    if (!this.bots.has(key)) {
      console.log(`[WARN] No bot for ${key} when setting room`);
    }
  }
}
