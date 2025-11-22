# Socket.IO Server for BirdMMO / DEGN.gg

Production-ready Socket.IO server for multiplayer BirdMMO game integration with DEGN.gg platform.

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   cd socket-server
   npm install
   ```

2. **Set environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run server:**
   ```bash
   npm start
   # Or with nodemon for auto-reload:
   npm run dev
   ```

4. **Verify server is running:**
   ```bash
   curl http://localhost:3001/health
   ```

### Deploy to Render

See `../deploy/README_DEPLOY.md` for detailed deployment instructions.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port (Render auto-sets) |
| `NEXT_PUBLIC_URL` | Yes | - | Next.js API base URL |
| `JWT_SECRET` | Yes | - | JWT secret (must match Next.js) |
| `SERVER_SECRET` | Yes | - | Secret for server→Next.js API calls |
| `REDIS_URL` | No | - | Redis connection string (enables adapter) |
| `FRONTEND_URL` | No | - | Additional allowed CORS origin |

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and lobby count.

## Socket.IO Events

### Client → Server

- `player_death` - Notify server that player died
  ```js
  socket.emit('player_death', { userId, lobbyId, ts: Date.now() });
  ```

- `player_position` - Broadcast player position to other players
  ```js
  socket.emit('player_position', { position: { x, y, z } });
  ```

### Server → Client

- `lobby_update` - Lobby state changed (players joined/left)
- `lobby_ready` - Lobby is ready, countdown started
- `match_start` - Match has started
- `player_update` - Player state changed (alive/dead)
- `match_end` - Match ended
- `winner_payout` - Winner payout processed

## Testing

### Run Simulation Script

```bash
# Test with 3 clients
node socket-server/tests/simulate-clients.js --num 3 --lobby test-1 --socket http://localhost:3001 --token dev-token
```

### Acceptance Tests

1. **Lint / Syntax Check:**
   ```bash
   node --check socket-server/index.js
   ```

2. **Simulation Test:**
   ```bash
   node socket-server/tests/simulate-clients.js --num 3 --lobby test-1 --socket http://localhost:3001 --token <token>
   ```
   
   **Expected:**
   - ✅ N clients connect
   - ✅ Bots spawn to fill lobby
   - ✅ Lobby ready countdown starts
   - ✅ Match starts
   - ✅ Clients emit `player_death`
   - ✅ Server detects last alive
   - ✅ Server emits `match_end`
   - ✅ Server calls `${NEXT_PUBLIC_URL}/api/match/complete`
   - ✅ Clients receive `winner_payout`

3. **Health Check:**
   ```bash
   curl http://localhost:3001/health
   ```
   
   **Expected:**
   ```json
   {"status":"ok","timestamp":1234567890,"lobbies":0,"redis":"disabled"}
   ```

## Architecture

### Lobby Management

Lobbies are stored in-memory (or Redis if adapter enabled). Each lobby contains:
- `players`: Map of connected players (socketId → player data)
- `bots`: Map of bot players (botId → bot data)
- `maxPlayers`: Maximum players per match (default: 8)
- `started`: Whether match has started

### Bot System

Bots are spawned server-side to fill lobbies:
- Bots are simulated with random death timers (30-120 seconds)
- In production, replace with physics-driven server-authoritative simulation
- Bots emit `player_update` events when they die

### Last-Man-Standing Logic

1. When a player dies, server marks them as `alive: false`
2. Server checks if only 1 player remains alive
3. If so, calls `endMatch()` which:
   - Calls Next.js `/api/match/complete` endpoint
   - Emits `match_end` and `winner_payout` to clients
   - Cleans up lobby after 60 seconds

## Troubleshooting

### "Token validation failed"
- Check `NEXT_PUBLIC_URL` is correct
- Verify Next.js `/api/socket/validate` endpoint is working
- In development, server allows tokens without validation if API is unavailable

### "Redis adapter failed"
- Server falls back to single-instance mode
- Check `REDIS_URL` is correct
- Redis is optional - server works without it

### "Bots not spawning"
- Check lobby has less than `maxPlayers`
- Verify `checkStartLobby()` is being called
- Check server logs for errors

## License

MIT

