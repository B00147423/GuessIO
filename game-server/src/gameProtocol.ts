import type tmi from "tmi.js";
import type { RoomManager } from "./roomManager.js";

export class GameProtocol {
  constructor(private readonly roomManager: RoomManager) {}

  /** @returns chat reply, `NO_GAME_ANNOUNCE` for rate-limited “no room” hint, or null */
  handleCommand(
    username: string,
    msg: string,
    channel: string,
    tags: tmi.ChatUserstate,
  ): string | null {
    const lower = msg.toLowerCase().trim();
    const channelName = normalizeChannel(channel);
    const usernameLower = username.toLowerCase();

    if (isJoinCommand(lower)) {
      const room = this.roomManager.getCurrentRoom(channel);
      if (!room) {
        console.log(`[TWITCH] Join from ${username} but no mapped room for ${channel}`);
        return "NO_GAME_ANNOUNCE";
      }
      if (usernameLower === channelName) {
        console.log(`[PROTO] Streamer ${username} tried chat join — ignored`);
        return null;
      }
      if (room.hasPlayer(username)) {
        return null;
      }
      console.log(`[PROTO] ${username} joined the game`);
      room.join(null, username);
      // Silent join — player shows on streamer UI; avoids rate-limit flood in chat
      return null;
    }

    const room = this.roomManager.getCurrentRoom(channel);
    if (!room) {
      return null;
    }

    if (lower.startsWith("!guess")) {
      const guess = lower.slice("!guess".length).trim();
      if (!guess) return null;
      if (usernameLower === channelName) {
        console.log(`[PROTO] Blocked guess from room creator ${username}`);
        return null;
      }
      console.log(`[PROTO] ${username} guessed: ${guess}`);
      room.handleGuess(username, guess);
      return null;
    }

    if (lower === "!start") {
      console.log("[PROTO] !start — use streamer UI or start_round with a word");
      return null;
    }
    
    if (lower === "!players") {
      return `${room.getPlayers().size} players joined.`;
    }
    
    if (lower === "!skip" || lower === "!endround") {
      if (!canUseModCommands(tags, channelName, usernameLower)) {
        console.log(`[PROTO] Blocked ${lower} from ${username} — not mod/broadcaster`);
        return null;
      }
      if (!room.getCurrentRound().active) return null;
      room.skipRound();
      return null;
    }
    return null;
  }
}

function canUseModCommands(
  tags: tmi.ChatUserstate,
  channelName: string,
  usernameLower: string,
): boolean {
  if (tags.mod) return true;
  if (tags.badges?.broadcaster === "1") return true;
  if (usernameLower === channelName) return true;
  return false;
}

function isJoinCommand(lower: string): boolean {
  return lower === "join" || lower === "!join" || lower.startsWith("!join ");
}

function normalizeChannel(channel: string): string {
  return channel.startsWith("#") ? channel.slice(1).toLowerCase() : channel.toLowerCase();
}
