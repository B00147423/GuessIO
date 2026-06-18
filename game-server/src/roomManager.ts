import type { ClientSession, GameMessage } from "./types.js";
import { Room } from "./room.js";
import type { GameServer } from "./gameServer.js";

function normalizeRoom(roomId: string): string {
  if (roomId.startsWith("#")) return roomId.slice(1);
  return roomId;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  /** roomId -> twitch channel name (no #) */
  private roomChannels = new Map<string, string>();
  private server: GameServer | null = null;

  setServer(server: GameServer): void {
    this.server = server;
  }

  getCurrentRoom(channel: string): Room | undefined {
    const normalized = normalizeRoom(channel);
    for (const [roomId, ch] of this.roomChannels) {
      if (ch.toLowerCase() === normalized) {
        return this.rooms.get(roomId);
      }
    }
    return undefined;
  }

  leaveAll(session: ClientSession): void {
    for (const room of this.rooms.values()) {
      room.leave(session);
    }
  }

  onMessage(session: ClientSession | null, raw: string): void {
    try {
      const j = JSON.parse(raw) as GameMessage;
      const type = j.type ?? "";
      const roomId = normalizeRoom(j.room ?? "");

      switch (type) {
        case "join":
          this.handleJoin(session, j, roomId);
          break;
        case "leave":
          this.handleLeave(session, j, roomId);
          break;
        case "chat":
          this.handleChat(j, roomId);
          break;
        case "start_round":
          this.handleStartRound(roomId, j);
          break;
        case "guess":
          this.handleGuessBlocked();
          break;
        case "end_round":
          this.handleEndRound(roomId);
          break;
        case "stop_bot":
          this.handleStopBot(session, j);
          break;
        case "spawn_bot":
          this.handleSpawnBot(session, j);
          break;
        case "map_twitch_room":
          this.handleMapTwitchRoom(j);
          break;
        case "status":
          if (this.server) this.server.broadcast(raw);
          break;
        case "pong":
          session?.markPongReceived();
          break;
        case "draw":
          this.handleDraw(roomId, j);
          break;
        case "clear":
          this.handleClear(roomId);
          break;
        case "undo":
          this.handleUndo(roomId);
          break;
        case "get_state":
          if (session) this.handleRestoreState(session, roomId);
          break;
        default:
          console.warn(`[WARN] Unknown type: ${type}`, raw);
      }
    } catch (e) {
      console.error("[ERROR] onMessage parse failed:", e, raw);
    }
  }

  private getOrCreateRoom(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room();
      this.wireRoomChatAnnouncements(room, roomId);
      this.rooms.set(roomId, room);
      console.log(`[ROOM] Creating new room: ${roomId}`);
    }
    return room;
  }

  private wireRoomChatAnnouncements(room: Room, roomId: string): void {
    room.setChatAnnouncements({
      onRoundStart: () => {
        this.announceToTwitch(
          roomId,
          "Round starting — type !guess <word> in chat now!",
        );
      },
      onCorrectGuess: (username) => {
        this.announceToTwitch(roomId, `${username} got it right!`);
      },
      onRoundTimeout: (word) => {
        this.announceToTwitch(roomId, `Time's up! The word was: ${word}`);
      },
      onRoundSkipped: (word) => {
        this.announceToTwitch(roomId, `Round skipped. The word was: ${word}`);
      },
    });
  }

  private announceToTwitch(roomId: string, message: string): void {
    const channel = this.roomChannels.get(roomId);
    if (!channel || !this.server) return;
    this.server.sayInChannel(channel, message);
  }

  private handleJoin(
    session: ClientSession | null,
    j: GameMessage,
    roomId: string,
  ): void {
    this.cleanupAbandonedRooms();
    this.cleanupExpiredRooms();

    let username = "";
    if (typeof j.payload === "string") {
      username = j.payload;
    } else if (j.payload && typeof j.payload === "object" && "username" in j.payload) {
      username = String((j.payload as { username?: string }).username ?? "");
    }
    if (!username || !roomId) return;

    const isNewRoom = !this.rooms.has(roomId);
    const room = this.getOrCreateRoom(roomId);
    const channel = (j.channel ?? "").replace(/^#/, "").toLowerCase();

    if (!isNewRoom && channel && this.server) {
      this.roomChannels.set(roomId, channel);
      this.server.setCurrentRoom(channel, roomId);
      console.log(`[ROOM] Reconnecting to existing room: ${roomId}`);
    }

    if (isNewRoom && channel && this.server) {
      for (const [rid, ch] of [...this.roomChannels]) {
        if (ch === channel) this.roomChannels.delete(rid);
      }
      this.roomChannels.set(roomId, channel);
      this.server.setCurrentRoom(channel, roomId);
      console.log(`[ROOM] Bot connected to new room: ${roomId}`);
    }

    if (room.hasPlayer(username)) {
      console.log(`[SPAM] Duplicate join from ${username}`);
      if (session) room.join(session, username);
      return;
    }

    room.join(session, username);
  }

  private handleLeave(
    session: ClientSession | null,
    j: GameMessage,
    roomId: string,
  ): void {
    const room = this.rooms.get(roomId);
    if (!room || !session) return;

    if (j.intentional) {
      for (const [uname, p] of room.getPlayers()) {
        room.broadcast(
          JSON.stringify({
            type: "leave",
            payload: { id: p.id, username: uname },
          }),
        );
      }
      room.resetLobby();
      room.clearHistory();
    }

    room.leave(session);
    if (room.isEmpty()) {
      console.log(`[ROOM] Room ${roomId} is empty, removing`);
      this.rooms.delete(roomId);
      this.roomChannels.delete(roomId);
    }
  }

  private handleChat(j: GameMessage, roomId: string): void {
    const payload = typeof j.payload === "string" ? j.payload : "";
    const room = this.rooms.get(roomId);
    if (!room || !payload) return;
    room.broadcast(
      JSON.stringify({ type: "chat", room: roomId, payload }),
    );
  }

  private handleStartRound(roomId: string, j: GameMessage): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    let word = "apple";
    if (j.payload && typeof j.payload === "object" && "word" in j.payload) {
      word = String((j.payload as { word?: string }).word ?? word);
    }
    room.startRound(word);
  }

  private handleGuessBlocked(): void {
    console.log("[SECURITY] Blocked direct guess attempt from WebSocket");
  }

  private handleEndRound(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.endRound();
  }

  private handleStopBot(session: ClientSession | null, j: GameMessage): void {
    const channel = j.channel ?? "";
    if (!this.server) return;

    const room = this.getCurrentRoom(channel);
    if (room) {
      console.log(`[ROOM] Clearing lobby before stop_bot for ${channel}`);
      room.resetLobby();
    }

    this.server.stopBot(channel);
    console.log(`ADMIN Stopped Twitch bot for channel: ${channel}`);

    if (session) {
      session.send(
        JSON.stringify({
          type: "status",
          status: "ok",
          message: "Bot stopped",
          channel,
        }),
      );
    }
  }

  private handleSpawnBot(session: ClientSession | null, j: GameMessage): void {
    const oauth = j.oauth ?? "";
    const nick = j.nick ?? "";
    const channel = j.channel ?? "";
    const roomId = normalizeRoom(j.room_id ?? j.room ?? "");
    if (!this.server) return;

    const spawned = this.server.spawnBot(oauth, nick, channel);
    const message = spawned
      ? `Spawned Twitch bot for ${channel}`
      : `Bot for ${channel} already exists`;

    if (spawned) console.log(`ADMIN ${message}`);
    else console.log(`[ADMIN] ${message}`);

    if (roomId && channel) {
      const channelName = channel.replace(/^#/, "").toLowerCase();
      for (const [rid, ch] of [...this.roomChannels]) {
        if (ch.toLowerCase() === channelName) this.roomChannels.delete(rid);
      }
      this.getOrCreateRoom(roomId);
      this.roomChannels.set(roomId, channelName);
      this.server.setCurrentRoom(channelName, roomId);
      console.log(`[ROOM] Mapped ${channelName} -> ${roomId} via spawn_bot`);
    }

    if (session) {
      session.send(
        JSON.stringify({
          type: "status",
          status: spawned ? "ok" : "exists",
          message,
          channel,
        }),
      );
    }
  }

  private handleMapTwitchRoom(j: GameMessage): void {
    const payload = (j.payload ?? {}) as { twitch_name?: string; room_id?: string };
    const twitchName = payload.twitch_name ?? "";
    const roomId = payload.room_id ?? "";
    if (!twitchName || !roomId) return;

    this.roomChannels.set(roomId, twitchName);
    if (this.server) {
      this.server.setCurrentRoom(twitchName, roomId);
    }
  }

  private handleDraw(roomId: string, j: GameMessage): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const drawMsg = { type: "draw", room: roomId, payload: j.payload };
    room.addStroke(drawMsg);
    room.broadcast(JSON.stringify(drawMsg));
  }

  private handleClear(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.clearHistory();
    room.broadcast(JSON.stringify({ type: "clear", room: roomId }));
  }

  private handleUndo(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (!room.undoLastStroke()) return;
    room.broadcast(
      JSON.stringify({
        type: "undo",
        room: roomId,
        payload: { strokes: room.getStrokeHistory() },
      }),
    );
  }

  private handleRestoreState(session: ClientSession, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[DEBUG] Room not found: ${roomId}`);
      return;
    }

    const round = room.getCurrentRound();
    const payload: Record<string, unknown> = {
      players: room.getPlayerUsernames(),
      strokes: room.getStrokeHistory(),
    };

    if (round.active) {
      const elapsed = Math.floor((Date.now() - round.startTime) / 1000);
      let timeLeft = round.duration - elapsed;
      if (timeLeft < 0) timeLeft = 0;
      payload.round = {
        active: true,
        word: round.word,
        hint: round.hint,
        timeLeft,
      };
    }

    session.send(
      JSON.stringify({ type: "current_state", payload }),
    );
    console.log(`[STATE] Sent current state for room: ${roomId}`);
  }

  private cleanupAbandonedRooms(): void {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty()) {
        console.log(`[ROOM] Cleaning up abandoned room: ${id}`);
        this.rooms.delete(id);
        this.roomChannels.delete(id);
      }
    }
  }

  private cleanupExpiredRooms(): void {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (now - room.getLastActivity() > oneHour) {
        console.log(`[ROOM] Cleaning up expired room: ${id}`);
        this.rooms.delete(id);
        this.roomChannels.delete(id);
      }
    }
  }
}
