# Deployment Guide for Socket.IO Server

Step-by-step instructions for deploying the Socket.IO server to Render.com.

## Prerequisites

- GitHub repository with `socket-server/` directory
- DNS access for `sockets.degn.gg` (or your domain)
- Environment variables ready (see below)

## Step 1: Create Web Service on Render

1. Go to: https://dashboard.render.com
2. Click: **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the repository containing `socket-server/` directory

## Step 2: Configure Build Settings

- **Name**: `degn-socket-server` (or your choice)
- **Environment**: `Node`
- **Build Command**: `cd socket-server && npm install`
- **Start Command**: `cd socket-server && npm start`
- **Root Directory**: Leave empty (or set to `socket-server/` if needed)

## Step 3: Set Environment Variables

Go to **Environment** tab and add:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | `10000` (or leave empty - Render auto-sets) | No |
| `NEXT_PUBLIC_URL` | `https://degn-gg.vercel.app` | **Yes** |
| `JWT_SECRET` | `your-strong-random-secret-here` | **Yes** |
| `SERVER_SECRET` | `your-strong-random-secret-here` | **Yes** |
| `REDIS_URL` | `redis://...` (optional, for scaling) | No |
| `FRONTEND_URL` | `https://degn-gg.vercel.app` | No |

**Generate secrets:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Important:** `JWT_SECRET` and `SERVER_SECRET` must match the values set in Next.js Vercel environment variables.

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete (2-3 minutes)
3. Note the service URL (e.g., `degn-socket-server.onrender.com`)

## Step 5: Configure Custom Domain

1. Go to **Settings** → **Custom Domains**
2. Add domain: `sockets.degn.gg`
3. Render will provide DNS records:
   - **Type**: CNAME
   - **Name**: `sockets`
   - **Value**: `degn-socket-server.onrender.com`
4. Add CNAME record in your DNS provider (e.g., Cloudflare, Namecheap)
5. Wait for DNS propagation (5-60 minutes)
6. Render will automatically provision SSL certificate

## Step 6: Verify Deployment

```bash
# Health check
curl https://sockets.degn.gg/health

# Should return:
# {"status":"ok","timestamp":1234567890,"lobbies":0,"redis":"disabled"}
```

## DNS Configuration

### CNAME Record

Add this record in your DNS provider:

```
Type: CNAME
Name: sockets
Value: degn-socket-server.onrender.com  (or your Render service URL)
TTL: 3600 (or auto)
```

### Verification

After DNS propagates (5-60 minutes):

```bash
# Check DNS
nslookup sockets.degn.gg

# Should resolve to your service IP
```

## Environment Variables Summary

### Required

- `NEXT_PUBLIC_URL` - Next.js API base URL
- `JWT_SECRET` - JWT secret (must match Next.js)
- `SERVER_SECRET` - Secret for server→Next.js API calls (must match Next.js)

### Optional

- `PORT` - Server port (usually auto-set by Render)
- `REDIS_URL` - Redis connection string (for horizontal scaling)
- `FRONTEND_URL` - Additional allowed CORS origin

## TLS/SSL

Render automatically provisions SSL certificates for custom domains. No manual configuration needed.

## Troubleshooting

### "Connection refused"
- Check server is running (health check)
- Check `PORT` is correct
- Check firewall/security groups allow connections

### "CORS error"
- Check `FRONTEND_URL` is set
- Check allowed origins in `socket-server/index.js`
- Verify Next.js origin is in allowed list

### "Token validation failed"
- Check `NEXT_PUBLIC_URL` is correct
- Verify Next.js `/api/socket/validate` endpoint works
- Check `JWT_SECRET` matches between Socket.IO server and Next.js

### "Redis adapter failed"
- Server falls back to single-instance mode
- Check `REDIS_URL` is correct
- Redis is optional - server works without it

## Next Steps

After deployment:

1. ✅ Test health check endpoint
2. ✅ Verify Socket.IO connection from browser
3. ✅ Test token validation
4. ✅ Test match flow (join → start → death → end)
5. ✅ Monitor logs for errors

See `../socket-server/tests/README.md` for testing instructions.
