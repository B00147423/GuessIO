import { WebSocketServer } from "ws";
import { createClientSession } from "./clientSession.js";
import { RoomManager } from "./roomManager.js";
import { TwitchBotManager } from "./twitchBotManager.js";
import { GameProtocol } from "./gameProtocol.js";
import type { ClientSession } from "./types.js";

export class GameServer {
  readonly roomManager = new RoomManager();
  private readonly sessions = new Set<ClientSession>();
  private wss: WebSocketServer | null = null;
  private botManager: TwitchBotManager;

  constructor() {
    this.roomManager.setServer(this);
    this.botManager = new TwitchBotManager(this);
    const protocol = new GameProtocol(this.roomManager);
    this.botManager.setGameProtocol(protocol);
  }

  start(port: number): void {
    this.wss = new WebSocketServer({ port, host: "0.0.0.0" });

    this.wss.on("connection", (ws, req) => {
      console.log("Handshake complete!", req.socket.remoteAddress);
      const session = createClientSession(ws, (s) => this.removeSession(s));
      this.sessions.add(session);

      ws.on("message", (data) => {
        const text = typeof data === "string" ? data : data.toString("utf8");
        console.log("Handling message:", text.slice(0, 200));
        this.onClientMessage(session, text);
      });
    });

    this.wss.on("listening", () => {
      console.log(`Server started successfully on port ${port}`);
    });
  }

  spawnBot(oauth: string, nick: string, channel: string): boolean {
    return this.botManager.spawnBot(oauth, nick, channel);
  }

  stopBot(channel: string): boolean {
    this.botManager.stopBot(channel);
    return true;
  }

  setCurrentRoom(channel: string, roomName: string): void {
    this.botManager.setCurrentRoom(channel, roomName);
    console.log(`[ROOM] Set current room for ${channel} -> ${roomName}`);
  }

  sayInChannel(channel: string, message: string): void {
    this.botManager.sayInChannel(channel, message);
  }

  broadcast(msg: string): void {
    for (const s of this.sessions) {
      s.send(msg);
    }
  }

  onTwitchStatus(msg: Record<string, unknown>): void {
    this.onClientMessage(null, JSON.stringify(msg));
  }

  onClientMessage(session: ClientSession | null, msg: string): void {
    this.roomManager.onMessage(session, msg);
  }

  private removeSession(session: ClientSession): void {
    if (!this.sessions.has(session)) return;
    this.sessions.delete(session);
    this.roomManager.leaveAll(session);
  }

  async shutdown(): Promise<void> {
    this.broadcast(JSON.stringify({ type: "system", payload: "server shutting down" }));
    for (const s of this.sessions) {
      s.close();
    }
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => resolve());
    });
  }
}
