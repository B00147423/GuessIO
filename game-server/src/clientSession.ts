import { randomUUID } from "node:crypto";
import type WebSocket from "ws";
import type { ClientSession } from "./types.js";

const PING_INTERVAL_MS = 30_000;

export function createClientSession(
  ws: WebSocket,
  onClose: (session: ClientSession) => void,
): ClientSession {
  const id = randomUUID();
  const writeQueue: string[] = [];
  let writing = false;
  let pongReceived = true;
  let closed = false;

  const flushWrite = () => {
    if (writing || writeQueue.length === 0 || ws.readyState !== ws.OPEN) {
      if (writeQueue.length === 0) writing = false;
      return;
    }
    writing = true;
    const msg = writeQueue.shift()!;
    ws.send(msg, (err) => {
      writing = false;
      if (err) {
        session.close();
        return;
      }
      flushWrite();
    });
  };

  const session: ClientSession = {
    id,
    ws,
    send(data: string) {
      if (ws.readyState !== ws.OPEN) return;
      writeQueue.push(data);
      flushWrite();
    },
    markPongReceived() {
      pongReceived = true;
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(pingTimer);
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
      onClose(session);
    },
  };

  const pingTimer = setInterval(() => {
    if (ws.readyState !== ws.OPEN) {
      session.close();
      return;
    }
    if (!pongReceived) {
      console.warn("[WARN] Heartbeat timeout");
      session.close();
      return;
    }
    pongReceived = false;
    ws.ping();
  }, PING_INTERVAL_MS);

  ws.on("pong", () => {
    pongReceived = true;
  });

  ws.on("close", () => session.close());
  ws.on("error", () => session.close());

  return session;
}
