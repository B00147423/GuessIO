import type WebSocket from "ws";

export interface Player {
  id: number;
  username: string;
  score: number;
}

export interface Round {
  word: string;
  hint: string;
  active: boolean;
  startTime: number;
  duration: number;
}

export interface GameMessage {
  type: string;
  room?: string;
  channel?: string;
  payload?: unknown;
  intentional?: boolean;
  oauth?: string;
  nick?: string;
}

export interface ClientSession {
  readonly id: string;
  readonly ws: WebSocket;
  send(data: string): void;
  markPongReceived(): void;
  close(): void;
}
