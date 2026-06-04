import type { ClientSession, Player, Round } from "./types.js";

export class Room {
  private sessions = new Set<ClientSession>();
  private players = new Map<string, Player>();
  private nextPlayerId = 1;
  private strokeHistory: Record<string, unknown>[] = [];
  private lastActivity = Date.now();
  private currentRound: Round = {
    word: "",
    hint: "",
    active: false,
    startTime: 0,
    duration: 60,
  };
  private roundTimer: ReturnType<typeof setTimeout> | null = null;

  join(session: ClientSession | null, username: string): void {
    let isNewPlayer = false;
    let joinMsg: Record<string, unknown> | null = null;

    if (!this.players.has(username)) {
      const p: Player = { id: this.nextPlayerId++, username, score: 0 };
      this.players.set(username, p);
      isNewPlayer = true;
      joinMsg = {
        type: "join",
        payload: { id: p.id, username: p.username },
      };
      console.log(`[DEBUG] Room::join - Adding new player: ${username}`);
    }

    if (session) {
      this.sessions.add(session);
    }
    this.lastActivity = Date.now();

    if (isNewPlayer && joinMsg) {
      this.broadcast(JSON.stringify(joinMsg));
    }

    if (session) {
      this.replayPlayers(session);
      this.replayHistory(session);
    }
  }

  leave(session: ClientSession): boolean {
    this.sessions.delete(session);
    return this.sessions.size === 0;
  }

  resetLobby(): void {
    this.players.clear();
    this.nextPlayerId = 1;
  }

  broadcast(msg: string): void {
    for (const s of this.sessions) {
      s.send(msg);
    }
  }

  isEmpty(): boolean {
    return this.sessions.size === 0 && this.players.size === 0;
  }

  hasPlayer(username: string): boolean {
    return this.players.has(username);
  }

  getPlayers(): Map<string, Player> {
    return this.players;
  }

  getPlayerUsernames(): string[] {
    return [...this.players.keys()];
  }

  getStrokeHistory(): Record<string, unknown>[] {
    return this.strokeHistory;
  }

  getCurrentRound(): Round {
    return this.currentRound;
  }

  getLastActivity(): number {
    return this.lastActivity;
  }

  addStroke(stroke: Record<string, unknown>): void {
    this.strokeHistory.push(stroke);
    this.lastActivity = Date.now();
  }

  clearHistory(): void {
    this.strokeHistory = [];
  }

  startRound(word: string): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    this.currentRound = {
      word,
      hint: "_".repeat(word.length),
      active: true,
      startTime: Date.now(),
      duration: 60,
    };

    const msg = {
      type: "round_start",
      payload: {
        word: this.currentRound.word,
        hint: this.currentRound.hint,
        time: this.currentRound.duration,
      },
    };
    this.broadcast(JSON.stringify(msg));
    this.startServerTimer();
  }

  handleGuess(username: string, guess: string): void {
    if (!this.currentRound.active) {
      console.log(`[ROOM] Guess from ${username} ignored - no active round`);
      return;
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = this.currentRound.word.trim().toLowerCase();

    console.log(
      `[ROOM] Processing guess from ${username}: ${guess} (word: ${this.currentRound.word})`,
    );

    if (normalizedGuess === normalizedWord) {
      const player = this.players.get(username);
      if (player) player.score += 100;

      this.broadcast(
        JSON.stringify({
          type: "guess",
          payload: {
            user: username,
            word: guess,
            correct: true,
            score: player?.score ?? 0,
          },
        }),
      );
      this.endRoundInternal();
    } else {
      this.broadcast(
        JSON.stringify({
          type: "guess",
          payload: { user: username, word: guess, correct: false },
        }),
      );
    }
  }

  endRound(): void {
    this.endRoundInternal();
  }

  private endRoundInternal(): void {
    if (!this.currentRound.active) return;
    this.currentRound.active = false;

    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    const scores: Record<string, number> = {};
    for (const [username, p] of this.players) {
      scores[username] = p.score;
    }

    this.broadcast(
      JSON.stringify({
        type: "round_end",
        payload: { word: this.currentRound.word, scores },
      }),
    );
  }

  private startServerTimer(): void {
    this.roundTimer = setTimeout(() => {
      console.log("[ROOM] Server timer expired - ending round");
      this.endRound();
    }, this.currentRound.duration * 1000);
  }

  replayHistory(session: ClientSession): void {
    for (const stroke of this.strokeHistory) {
      session.send(JSON.stringify(stroke));
    }
  }

  replayPlayers(session: ClientSession): void {
    for (const p of this.players.values()) {
      session.send(
        JSON.stringify({
          type: "join",
          payload: { id: p.id, username: p.username },
        }),
      );
    }
  }
}
