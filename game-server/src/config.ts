import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface TwitchConfig {
  oauth: string;
  nick: string;
  channel: string;
}

export function loadConfig(): TwitchConfig {
  const oauth = process.env.TWITCH_OAUTH ?? "";
  const nick = process.env.TWITCH_NICK ?? "";
  const channel = process.env.TWITCH_CHANNEL ?? "";

  if (oauth && nick && channel) {
    return { oauth, nick, channel };
  }

  const configPath = resolve(process.cwd(), "config.json");
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, string>;
      return {
        oauth: oauth || raw.TWITCH_OAUTH || "",
        nick: nick || raw.TWITCH_NICK || "",
        channel: channel || raw.TWITCH_CHANNEL || "",
      };
    } catch {
      // fall through
    }
  }

  return { oauth, nick, channel };
}

export const WS_PORT = Number(process.env.WS_PORT ?? "9001");
