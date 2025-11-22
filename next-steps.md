# Next Steps - Deployment Checklist

Exact commands and steps to deploy Socket.IO server and integrate with DEGN.gg.

## Step 1: Deploy Socket.IO Server to Render

### 1.1 Create Web Service

1. Go to: https://dashboard.render.com
2. Click: **"New +"** → **"Web Service"**
3. Connect GitHub repository: `Foli-AI/degn.gg`
4. Select repository

### 1.2 Configure Build Settings

- **Name**: `degn-socket-server`
- **Environment**: `Node`
- **Build Command**: `cd socket-server && npm install`
- **Start Command**: `cd socket-server && npm start`
- **Root Directory**: (leave empty)

### 1.3 Set Environment Variables

Go to **Environment** tab and add:

```bash
PORT=10000
NEXT_PUBLIC_URL=https://degn-gg.vercel.app
JWT_SECRET=<generate-with-openssl-rand-hex-32>
SERVER_SECRET=<generate-with-openssl-rand-hex-32>
```

**Generate secrets:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Wait for build (2-3 minutes)
3. Note service URL: `degn-socket-server.onrender.com`

### 1.5 Configure Custom Domain

1. Go to **Settings** → **Custom Domains**
2. Add: `sockets.degn.gg`
3. Render provides DNS record:
   - **Type**: CNAME
   - **Name**: `sockets`
   - **Value**: `degn-socket-server.onrender.com`
4. Add CNAME in DNS provider (Cloudflare/Namecheap)
5. Wait for DNS propagation (5-60 minutes)
6. SSL certificate auto-provisioned

## Step 2: Add Next.js API Routes

### 2.1 Merge socket-nextjs-stubs Branch

```bash
git checkout main
git merge socket-nextjs-stubs
git push origin main
```

### 2.2 Set Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select project: `degn-arcade`
3. Go to: **Settings** → **Environment Variables**
4. Add:
   - `JWT_SECRET` = `<same-as-render>`
   - `SERVER_SECRET` = `<same-as-render>`
   - `NEXT_PUBLIC_URL` = `https://degn-gg.vercel.app`
5. Save and redeploy

### 2.3 Install Dependencies

```bash
cd degn-arcade
npm install jsonwebtoken @types/jsonwebtoken
```

### 2.4 Test API Endpoints

```bash
# Test token issue
curl -X POST https://degn-gg.vercel.app/api/socket/issue-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","lobbyId":"test"}'

# Should return: {"token":"...","expiresIn":120}
```

## Step 3: Apply Client Patches

### 3.1 Merge socket-client-patches Branch

```bash
git checkout main
git merge socket-client-patches
git push origin main
```

### 3.2 Apply Patches to BirdMMO

1. **Replace Network.js:**
   ```bash
   # In BirdMMO repo
   cp client-patches/Network.js.complete src/client/Network.js
   ```

2. **Apply death/restart patches:**
   - Follow instructions in `client-patches/death-and-restart.txt`
   - Patch: `src/client/Player.jsx`
   - Patch: `src/client/useKeyboard.jsx`
   - Patch: `src/client/Game.jsx`
   - Patch: `src/client/App.jsx` or `Overlay.jsx`

3. **Set environment variable:**
   ```bash
   # In BirdMMO .env
   REACT_APP_SOCKET_URL=https://sockets.degn.gg
   ```

4. **Rebuild:**
   ```bash
   npm run build
   ```

## Step 4: Test Locally

### 4.1 Test Socket.IO Server

```bash
cd socket-server
npm install
PORT=3001 NEXT_PUBLIC_URL=http://localhost:3000 SERVER_SECRET=test-secret node index.js
```

### 4.2 Test Simulation Script

```bash
node socket-server/tests/simulate-clients.js --num 3 --lobby test-1 --socket http://localhost:3001 --token dev-token
```

**Expected:**
- ✅ Clients connect
- ✅ Bots spawn
- ✅ Match starts
- ✅ Players die
- ✅ Match ends
- ✅ Payout API called

## Step 5: Verify Production

### 5.1 Health Check

```bash
curl https://sockets.degn.gg/health
# Should return: {"status":"ok",...}
```

### 5.2 Socket.IO Connection

```javascript
// In browser console
const socket = io('https://sockets.degn.gg', {
  auth: { token: 'test-token' }
});
socket.on('connect', () => console.log('Connected:', socket.id));
```

### 5.3 Test Full Flow

1. Load game in browser
2. Verify token received via postMessage
3. Verify Socket.IO connects
4. Join lobby
5. Verify bots spawn
6. Verify match starts
7. Crash (die)
8. Verify no restart
9. Wait for match end
10. Verify payout message

## Troubleshooting

### "Token validation failed"
- Check `JWT_SECRET` matches between Render and Vercel
- Check `NEXT_PUBLIC_URL` is correct
- Verify `/api/socket/validate` endpoint works

### "Connection refused"
- Check server is running (health check)
- Check DNS propagated (nslookup sockets.degn.gg)
- Check firewall allows connections

### "CORS error"
- Check `FRONTEND_URL` is set in Render
- Check allowed origins in `socket-server/index.js`
- Verify Next.js origin is in allowed list

## Completion Checklist

- [ ] Socket.IO server deployed to Render
- [ ] Custom domain `sockets.degn.gg` configured
- [ ] Environment variables set in Render
- [ ] Next.js API routes merged and deployed
- [ ] Environment variables set in Vercel
- [ ] Client patches applied to BirdMMO
- [ ] `REACT_APP_SOCKET_URL` set in BirdMMO
- [ ] Health check passes
- [ ] Socket.IO connection works
- [ ] Full match flow tested

## Support

For issues:
1. Check server logs in Render dashboard
2. Check Next.js logs in Vercel dashboard
3. Check browser console for client errors
4. Review `verification.md` for verification steps

