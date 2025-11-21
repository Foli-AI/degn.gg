# Pull Request Templates

Copy these templates when creating PRs on GitHub.

## PR 1: Add socket-server matchmaker

**Title:** `Add socket-server matchmaker`

**Description:**

```markdown
## Socket.IO Server for BirdMMO / DEGN.gg

This PR adds a production-ready Socket.IO server for multiplayer BirdMMO game integration.

### Files Added

- `socket-server/index.js` - Main Socket.IO server
- `socket-server/package.json` - Dependencies
- `socket-server/.env.example` - Environment variables template
- `socket-server/tests/simulate-clients.js` - Client simulation script
- `socket-server/README.md` - Setup and usage guide
- `deploy/README_DEPLOY.md` - Deployment instructions
- `summary.md` - Implementation summary
- `security.md` - Security documentation
- `next-steps.md` - Deployment checklist
- `verification.md` - Verification guide

### Features

- ✅ Token-based authentication via Next.js API
- ✅ Lobby management with automatic bot spawning
- ✅ Last-man-standing game logic
- ✅ Server-authoritative bot simulation
- ✅ Match completion with payout integration
- ✅ Redis adapter support for horizontal scaling

### Environment Variables Required

- `PORT` (default: 3000, Render auto-sets)
- `NEXT_PUBLIC_URL` - Next.js API base URL
- `JWT_SECRET` - JWT secret (must match Next.js)
- `SERVER_SECRET` - Secret for server→Next.js API calls
- `REDIS_URL` (optional) - Redis connection string

### Testing

```bash
# Syntax check
node --check socket-server/index.js

# Run simulation
node socket-server/tests/simulate-clients.js --num 3 --lobby test-1 --socket http://localhost:3001 --token dev-token
```

### Acceptance Criteria

- [x] Server runs locally
- [x] Accepts Socket.IO connections
- [x] Spawns bots to fill lobbies
- [x] Detects last-man-standing
- [x] Calls Next.js `/api/match/complete` endpoint
- [x] Simulation script demonstrates full flow

### Deployment

See `deploy/README_DEPLOY.md` for Render.com deployment instructions.

### Next Steps

1. Deploy to Render.com
2. Configure custom domain `sockets.degn.gg`
3. Set environment variables
4. Verify health endpoint
```

---

## PR 2: Add socket auth & match-complete stubs

**Title:** `Add socket auth & match-complete stubs`

**Description:**

```markdown
## Next.js API Endpoints for Socket.IO Integration

This PR adds API route stubs for Socket.IO token management and match completion.

### Files Added

- `src/app/api/socket/issue-token/route.ts` - Issue JWT tokens
- `src/app/api/socket/validate/route.ts` - Validate tokens
- `src/app/api/match/complete/route.ts` - Process match completion
- `src/app/api/README_SOCKET_IO.md` - Integration guide

### Features

- ✅ JWT token issuance with 2-minute TTL
- ✅ Token validation for Socket.IO server
- ✅ Match completion with payout processing
- ✅ Server-to-server authentication

### Environment Variables Required

- `JWT_SECRET` - JWT secret (must match Socket.IO server)
- `SERVER_SECRET` - Secret for server→Next.js API calls
- `NEXT_PUBLIC_URL` - Base URL of Next.js app
- `ESCROW_PRIVATE_KEY` (optional) - Escrow wallet for payouts
- `SOLANA_RPC` (optional) - Solana RPC endpoint

### Installation

```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### Testing

```bash
# Test token issue
curl -X POST http://localhost:3000/api/socket/issue-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","lobbyId":"test"}'

# Test token validate
curl -X POST http://localhost:3000/api/socket/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>"}'

# Test match complete
curl -X POST http://localhost:3000/api/match/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVER_SECRET>" \
  -d '{"lobbyId":"test","winner":"test","timestamp":1234567890}'
```

### Next Steps

1. Set environment variables in Vercel
2. Install dependencies
3. Test endpoints
4. Deploy to Vercel
```

---

## PR 3: Add Network.js replacement and patch instructions

**Title:** `Add Network.js replacement and patch instructions`

**Description:**

```markdown
## BirdMMO Client Patches for Socket.IO Integration

This PR adds client patches to integrate BirdMMO with the DEGN.gg Socket.IO server.

### Files Added

- `client-patches/Network.js.complete` - Complete Network.js replacement
- `client-patches/death-and-restart.txt` - Death/restart handling instructions
- `client-patches/README_PATCHES.md` - Patch application guide

### Changes Required

1. **Replace Network.js:**
   - Copy `client-patches/Network.js.complete` to `src/client/Network.js`
   - Implements token-based Socket.IO authentication

2. **Apply death/restart patches:**
   - Follow instructions in `client-patches/death-and-restart.txt`
   - Patch `src/client/Player.jsx` - Death handling
   - Patch `src/client/useKeyboard.jsx` - Block 'R' key
   - Patch `src/client/Game.jsx` - Disable restart until match_end
   - Patch `src/client/App.jsx` or `Overlay.jsx` - Restart button

3. **Set environment variable:**
   ```bash
   REACT_APP_SOCKET_URL=https://sockets.degn.gg
   ```

### Features

- ✅ Token-based Socket.IO connection
- ✅ Listens for `SOCKET_TOKEN` postMessage from parent window
- ✅ Handles lobby_update, lobby_ready, match_start, player_update, match_end, winner_payout events
- ✅ Blocks restart until match_end
- ✅ Disables input when dead

### Testing

After applying patches:

1. Test token reception via postMessage
2. Test Socket.IO connection
3. Test death handling (no restart)
4. Test match end flow

### Search Terms

To find code locations in BirdMMO repo:

- Socket.IO: `import { io } from "socket.io-client"`, `const socket = io()`
- Death: `setCrashed(true)`, `collision`, `onDeath()`
- Restart: `window.location.reload()`, `restart`, `respawn`, `KeyR`

### Next Steps

1. Apply patches to BirdMMO repo
2. Set `REACT_APP_SOCKET_URL` environment variable
3. Rebuild client
4. Test integration
```

---

## Creating PRs on GitHub

1. Go to: https://github.com/Foli-AI/degn.gg/pulls
2. Click: **"New Pull Request"**
3. Select base: `main`
4. Select compare: `socket-server` (or `socket-nextjs-stubs`, `socket-client-patches`)
5. Copy corresponding template from above
6. Click: **"Create Pull Request"**
7. Do NOT merge yet - wait for review

