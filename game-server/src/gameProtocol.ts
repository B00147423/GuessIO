import type { RoomManager } from "./roomManager.js";

export class GameProtocol {
  constructor(private readonly roomManager: RoomManager) {}

  handleCommand(username: string, msg: string, channel: string): void {
    const room = this.roomManager.getCurrentRoom(channel);
    if (!room) {
      console.log(`[TWITCH] No mapped room for channel: ${channel}`);
      return;
    }

    const lower = msg.toLowerCase().trim();
    const channelName = normalizeChannel(channel);
    const usernameLower = username.toLowerCase();

    if (lower.startsWith("!join")) {
      console.log(`[PROTO] ${username} joined the game`);
      room.join(null, username);
      return;
    }

    if (lower.startsWith("!guess ")) {
      const guess = lower.slice(7).trim();
      if (usernameLower === channelName) {
        console.log(`[PROTO] Blocked guess from room creator ${username}`);
        return;
      }
      console.log(`[PROTO] ${username} guessed: ${guess}`);
      room.handleGuess(username, guess);
      return;
    }

    if (lower === "!start") {
      console.log("[PROTO] !start — use streamer UI or start_round with a word");
      return;
    }

    if (usernameLower === channelName) {
      console.log(`[PROTO] Blocked guess from room creator ${username}`);
      return;
    }

    room.handleGuess(username, lower);
  }
}

function normalizeChannel(channel: string): string {
  return channel.startsWith("#") ? channel.slice(1).toLowerCase() : channel.toLowerCase();
}
