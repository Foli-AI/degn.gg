# BirdMMO Client Patches

This directory contains patches to integrate BirdMMO with the DEGN.gg Socket.IO server.

## Files

- `Network.js.complete` - Complete replacement for `src/client/Network.js`
- `death-and-restart.txt` - Instructions for disabling restart and handling death

## How to Apply Patches

### Step 1: Replace Network.js

1. **Locate file in BirdMMO repo:**
   - Path: `src/client/Network.js`
   - Search for: `import { io } from "socket.io-client"` or `const socket = io()`

2. **Replace entire file:**
   - Copy contents of `Network.js.complete`
   - Replace entire `src/client/Network.js` file
   - Save and rebuild

3. **Set environment variable:**
   ```bash
   # In BirdMMO .env file
   REACT_APP_SOCKET_URL=https://sockets.degn.gg
   # Or for testing:
   REACT_APP_SOCKET_URL=http://localhost:3001
   ```

### Step 2: Apply Death/Restart Patches

Follow instructions in `death-and-restart.txt` to patch:

1. **Player.jsx** - Death handling
   - Search for: `setCrashed(true)`, `collision`, `onDeath`
   - Location: `src/client/Player.jsx`

2. **useKeyboard.jsx** - Block 'R' key
   - Search for: `keydown`, `keyup`, `e.key`
   - Location: `src/client/useKeyboard.jsx`

3. **Game.jsx** - Disable restart until match_end
   - Search for: `restart`, `window.location.reload()`, `respawn`
   - Location: `src/client/Game.jsx`

4. **App.jsx or Overlay.jsx** - Restart button
   - Search for: "Restart", "Play Again", `window.location.reload()`
   - Location: `src/client/App.jsx` or `src/client/Overlay.jsx`

## Search Terms to Find Code Locations

### Socket.IO Connection:
- `import { io } from "socket.io-client"`
- `const socket = io()`
- `this.socket = io(wsUrl)`
- `socket.io-client`

### Death Handling:
- `setCrashed(true)`
- `setIsAlive(false)`
- `onDeath()`
- `collision`
- `out_of_bounds`
- `pipe_collision`

### Restart Logic:
- `window.location.reload()`
- `restart`
- `respawn`
- `Play Again`
- `KeyR` or `'r'` key handler

## Integration Checklist

- [ ] Replace `Network.js` with token-based connection
- [ ] Add token listener for `SOCKET_TOKEN` postMessage
- [ ] Update `sendPlayerDeath()` to emit `player_death` event
- [ ] Update `sendPlayerState()` to emit `player_position` event
- [ ] Add socket listeners for `lobby_update`, `lobby_ready`, `match_start`, `player_update`, `match_end`, `winner_payout`
- [ ] Block 'R' key in `useKeyboard.jsx`
- [ ] Disable restart button until `match_end` event
- [ ] Remove automatic `window.location.reload()` on death
- [ ] Add "ELIMINATED" overlay that shows until match ends
- [ ] Set `REACT_APP_SOCKET_URL` environment variable
- [ ] Test with multiple clients

## Testing

After applying patches:

1. **Test token reception:**
   ```js
   // In browser console:
   window.postMessage({ type: 'SOCKET_TOKEN', token: 'test-token' }, '*');
   // Should see: "[Network] ✅ Received auth token from parent window"
   ```

2. **Test Socket.IO connection:**
   - Open browser console
   - Should see: "[Network] 🔌 Connecting to Socket.IO server"
   - Should see: "[Network] ✅ Socket.IO connected"

3. **Test death handling:**
   - Crash into pipe or ground
   - Should see: "[Network] Player update: { alive: false }"
   - Should NOT see automatic reload
   - Should see "ELIMINATED" overlay

4. **Test match end:**
   - Wait for last player to die
   - Should see: "[Network] Match ended"
   - Should see "Play Again" button appear
   - Should see winner payout message

## Troubleshooting

### "Auth token not received"
- Check parent window is sending `SOCKET_TOKEN` postMessage
- Check query string for `?token=...` fallback
- Verify Next.js `/api/socket/issue-token` endpoint is working

### "Socket.IO connection error"
- Check `REACT_APP_SOCKET_URL` is correct (default: `https://sockets.degn.gg`)
- Check Socket.IO server is running
- Check CORS allows your origin
- Check token is valid (not expired)

### "Restart still works"
- Check `useKeyboard.jsx` blocks 'R' key
- Check `window.location.reload()` is not called directly
- Check `restartAllowed` state is set to `false` initially
- Check `match_end` event listener is set up

