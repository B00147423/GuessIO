/** Twitch IRC ≈ 20 messages / 30s for normal accounts — stay under that. */
const MAX_MESSAGES = 18;
const WINDOW_MS = 30_000;

export class ChatRateLimiter {
  private readonly sentAt: number[] = [];

  canSend(): boolean {
    const now = Date.now();
    while (this.sentAt.length > 0 && now - this.sentAt[0]! >= WINDOW_MS) {
      this.sentAt.shift();
    }
    if (this.sentAt.length >= MAX_MESSAGES) {
      return false;
    }
    this.sentAt.push(now);
    return true;
  }
}
