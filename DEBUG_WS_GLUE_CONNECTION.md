# 🔍 DEBUG: ws-glue.js Connection Issues

## Current Status
- ✅ MatchBridge detecting HTML5 mode
- ✅ World loading
- ❌ No GAME_START event received
- ❓ ws-glue.js connection status unknown

## Debug Steps

### Step 1: Check Browser Console for ws-glue.js Errors

Open browser DevTools (F12) and check:

1. **Console Tab** - Look for:
   - `[ws-glue]` log messages
   - Red error messages
   - WebSocket connection errors

2. **Network Tab** - Look for:
   - `ws-glue.js` file loading (status should be 200)
   - WebSocket connection to `wss://degn-gg-1.onrender.com/ws`
   - Check if WebSocket shows "101 Switching Protocols"

### Step 2: Add Console Logging to ws-glue.js

**Open file:** `degn-arcade/public/games/sol-bird/client/ws-glue.js`

**FIND the `connect()` function (around line 67):**

**ADD logging at the start:**
```javascript
function connect() {
  console.log('[ws-glue] Attempting to connect to:', wsUrl);
  
  if (!wsUrl) {
    console.error('[ws-glue] ❌ No wsUrl provided!');
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('[ws-glue] Already connected');
    return;
  }

  try {
    console.log('[ws-glue] Creating WebSocket connection...');
    socket = new WebSocket(wsUrl);
  } catch (e) {
    console.error('[ws-glue] ❌ Failed to create WebSocket:', e);
    scheduleReconnect();
    return;
  }
```

**FIND the `socket.addEventListener('open', ...)` section (around line 87):**

**ADD logging:**
```javascript
  socket.addEventListener('open', () => {
    console.log('[ws-glue] ✅ WebSocket connected!');
    console.log('[ws-glue] Sending init message:', { type: 'init', matchKey, playerId, username });

    // init payload
    socket.send(JSON.stringify({
      type: 'init',
      matchKey,
      playerId,
      username
    }));

    // flush pending
    while (pendingSends.length) {
      socket.send(JSON.stringify(pendingSends.shift()));
    }
  });
```

**FIND the `socket.addEventListener('message', ...)` section (around line 115):**

**ADD logging:**
```javascript
  socket.addEventListener('message', (msg) => {
    console.log('[ws-glue] 📨 Received message:', msg.data);
    
    try {
      const data = JSON.parse(msg.data);
      console.log('[ws-glue] Parsed message:', data);

      // normalize events we expect from backend
      const t = (data.type || '').toUpperCase();
      const payload = data.payload ?? data;
      const ev = { type: t, payload, raw: data };

      console.log('[ws-glue] Normalized event:', ev);

      // store latest event for Godot to poll
      window.latestMatchEvent = ev;
      console.log('[ws-glue] ✅ Set window.latestMatchEvent:', ev);

      // also dispatch DOM events so js clients can listen
      document.dispatchEvent(new CustomEvent('match:' + t.toLowerCase(), { detail: ev }));
    } catch (e) { 
      console.warn('[ws-glue] ❌ Invalid message:', e, msg.data); 
    }
  });
```

**FIND the `socket.addEventListener('error', ...)` section:**

**ADD logging:**
```javascript
  socket.addEventListener('error', (error) => {
    console.error('[ws-glue] ❌ WebSocket error:', error);
    scheduleReconnect();
  });

  socket.addEventListener('close', (event) => {
    console.log('[ws-glue] 🔌 WebSocket closed:', event.code, event.reason);
    scheduleReconnect();
  });
```

### Step 3: Check Backend Logs

Check Render.com logs for:
- `[MATCHMAKER] WebSocket connection opened`
- `[MATCHMAKER] ✅ Player connected to match:`
- Any errors when sending GAME_START

### Step 4: Verify Match is Created

The backend only sends GAME_START if:
1. A match exists for the matchKey
2. The match.gameType is 'sol-bird-race'

**Check if match is created when lobby starts:**
- Look for `matches.set(matchKey, match)` in backend logs
- Verify the matchKey in the URL matches what's in the backend

### Step 5: Manual Test in Browser Console

After page loads, run in browser console:

```javascript
// Check if ws-glue.js loaded
console.log('ws-glue loaded:', typeof window.__solBirdWsGlue !== 'undefined');
console.log('ws-glue info:', window.__solBirdWsGlue);

// Check latest event
console.log('Latest event:', window.latestMatchEvent);

// Check WebSocket state
if (window.__solBirdWsGlue) {
  console.log('wsUrl:', window.__solBirdWsGlue.wsUrl);
  console.log('matchKey:', window.__solBirdWsGlue.matchKey);
  console.log('playerId:', window.__solBirdWsGlue.playerId);
}
```

## Expected Console Output (After Adding Logs):

```
[ws-glue] Attempting to connect to: wss://degn-gg-1.onrender.com/ws
[ws-glue] Creating WebSocket connection...
[ws-glue] ✅ WebSocket connected!
[ws-glue] Sending init message: {type: "init", matchKey: "...", playerId: "...", username: "..."}
[ws-glue] 📨 Received message: {"type":"init_ack",...}
[ws-glue] 📨 Received message: {"type":"GAME_START",...}
[ws-glue] ✅ Set window.latestMatchEvent: {type: "GAME_START", ...}
[MatchBridge] ✅ Received event from backend: GAME_START
```

## Common Issues:

1. **ws-glue.js not loading** → Check Network tab, verify file exists
2. **WebSocket connection fails** → Check Render.com backend is running, CORS issues
3. **No GAME_START received** → Check backend logs, verify match exists
4. **MatchBridge not polling** → Already fixed, but verify HTML5 detection

