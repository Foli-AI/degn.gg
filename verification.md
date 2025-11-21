# Verification Guide

How to manually verify Socket.IO server deployment and integration.

## 1. Verify Health Endpoint

### Command:
```bash
curl https://sockets.degn.gg/health
```

### Expected Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "lobbies": 0,
  "redis": "disabled"
}
```

### If Failed:
- Check server is running in Render dashboard
- Check DNS propagated: `nslookup sockets.degn.gg`
- Check custom domain is configured in Render

## 2. Verify Socket.IO Connection

### Browser Console Test:
```javascript
// Load Socket.IO client library
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
document.head.appendChild(script);

// Wait for library to load, then:
const socket = io('https://sockets.degn.gg', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  auth: { token: 'test-token' }
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});
```

### Expected:
- ✅ Console shows: "Connected: <socket-id>"
- ❌ If error: Check CORS, DNS, or server logs

## 3. Verify Socket.IO Client Library

### Check Socket.IO.js is Accessible:
```bash
curl https://sockets.degn.gg/socket.io/socket.io.js
```

### Expected:
- Returns Socket.IO client library JavaScript
- Status code: 200 OK

### If Failed:
- Check Socket.IO path is `/socket.io`
- Check server is running
- Check firewall/security groups

## 4. Verify Token Validation

### Test Token Issue:
```bash
curl -X POST https://degn-gg.vercel.app/api/socket/issue-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","lobbyId":"test-lobby"}'
```

### Expected Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 120
}
```

### Test Token Validate:
```bash
TOKEN="<token-from-above>"
curl -X POST https://degn-gg.vercel.app/api/socket/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}"
```

### Expected Response:
```json
{
  "valid": true,
  "userId": "test-user",
  "lobbyId": "test-lobby"
}
```

## 5. Verify Match Completion API

### Test Match Complete:
```bash
curl -X POST https://degn-gg.vercel.app/api/match/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVER_SECRET>" \
  -d '{"lobbyId":"test-lobby","winner":"test-user","timestamp":1234567890}'
```

### Expected Response:
```json
{
  "ok": true,
  "tx": "mock_tx_...",
  "payout": 0.72,
  "houseRake": 0.08
}
```

### If Failed:
- Check `SERVER_SECRET` matches between Render and Vercel
- Check Authorization header format
- Check server logs for errors

## 6. Verify Simulation Script

### Run Test:
```bash
cd socket-server
node tests/simulate-clients.js --num 3 --lobby test-1 --socket https://sockets.degn.gg --token <valid-token>
```

### Expected Output:
```
[TEST] Simulating 3 clients
[CLIENT 1] ✅ Connected: abc123
[CLIENT 2] ✅ Connected: def456
[CLIENT 3] ✅ Connected: ghi789
[CLIENT 1] 📋 Lobby update: { players: 3, bots: 5, total: 8 }
[CLIENT 1] ⏰ Lobby ready, countdown: 5
[CLIENT 1] 🚀 Match started!
[CLIENT 1] 💀 Simulating death...
[CLIENT 1] 🏆 Match ended! Winner: test-user-2
[CLIENT 1] 💰 Winner payout: { winner: "test-user-2", payout: 0.72, tx: "..." }
[TEST] ✅ Test completed successfully!
```

## 7. Verify DNS Configuration

### Check DNS Resolution:
```bash
nslookup sockets.degn.gg
```

### Expected:
```
Name: sockets.degn.gg
Address: <Render-service-IP>
```

### Check CNAME:
```bash
dig sockets.degn.gg CNAME
```

### Expected:
```
sockets.degn.gg. 3600 IN CNAME degn-socket-server.onrender.com.
```

## 8. Verify SSL Certificate

### Check HTTPS:
```bash
curl -I https://sockets.degn.gg/health
```

### Expected:
```
HTTP/2 200
...
```

### Check Certificate:
```bash
openssl s_client -connect sockets.degn.gg:443 -servername sockets.degn.gg
```

### Expected:
- Valid certificate
- Issued by Let's Encrypt or similar
- Not expired

## 9. Verify Full Integration

### Test Flow:
1. **Load game in browser**
   - Open: `https://degn-gg.vercel.app/play/sol-bird`
   - Open browser console (F12)

2. **Check token received:**
   - Should see: `[Network] ✅ Received auth token from parent window`

3. **Check Socket.IO connection:**
   - Should see: `[Network] 🔌 Connecting to Socket.IO server: https://sockets.degn.gg`
   - Should see: `[Network] ✅ Socket.IO connected: <socket-id>`

4. **Check lobby update:**
   - Should see: `[Network] Lobby update: { players: [...], bots: [...] }`

5. **Check match start:**
   - Should see: `[Network] Match started: { ... }`

6. **Test death:**
   - Crash into pipe or ground
   - Should see: `[Network] Player update: { alive: false }`
   - Should NOT see automatic reload
   - Should see "ELIMINATED" overlay

7. **Check match end:**
   - Wait for last player to die
   - Should see: `[Network] Match ended: { winner: ... }`
   - Should see: `[Network] Winner payout: { ... }`
   - Should see "Play Again" button

## 10. Verify Logs

### Render Server Logs:
1. Go to: https://dashboard.render.com
2. Select service: `degn-socket-server`
3. Go to: **Logs** tab
4. Check for:
   - ✅ `[SERVER] 🚀 Socket.IO server running on port ...`
   - ✅ `[SERVER] ✅ Client connected: ...`
   - ✅ `[SERVER] 🏆 Match ended in lobby ...`
   - ✅ `[SERVER] ✅ Payout processed for lobby ...`

### Vercel API Logs:
1. Go to: https://vercel.com/dashboard
2. Select project: `degn-arcade`
3. Go to: **Deployments** → Latest → **Functions** tab
4. Check for:
   - ✅ Token issue requests
   - ✅ Token validate requests
   - ✅ Match complete requests

## Troubleshooting

### Health Check Fails:
- Check server is running
- Check DNS propagated
- Check firewall allows connections

### Socket.IO Connection Fails:
- Check CORS configuration
- Check token is valid
- Check server logs for errors

### Token Validation Fails:
- Check `JWT_SECRET` matches
- Check token not expired
- Check Next.js API is accessible

### Match Complete Fails:
- Check `SERVER_SECRET` matches
- Check Authorization header
- Check server logs for errors

## Success Criteria

All checks should pass:
- [x] Health endpoint returns 200 OK
- [x] Socket.IO connects successfully
- [x] Socket.IO.js library accessible
- [x] Token issue works
- [x] Token validate works
- [x] Match complete works
- [x] Simulation script passes
- [x] DNS resolves correctly
- [x] SSL certificate valid
- [x] Full integration flow works

If all checks pass, the Socket.IO server is ready for production! 🎉

