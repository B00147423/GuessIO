# GuessIO Game Server (TypeScript)

Real-time WebSocket server for rooms, drawing sync, rounds, and Twitch chat bots. Replaces the legacy C++ `GuessIOServer`.

## Run locally

```bash
cd game-server
npm install
npm run dev
```

WebSocket: `ws://localhost:9001` (same protocol as before — no frontend changes required).

Optional Twitch config: copy `config.json.example` to `config.json`, or set `TWITCH_OAUTH`, `TWITCH_NICK`, `TWITCH_CHANNEL`.

## Docker

```bash
docker compose up game-server
```
