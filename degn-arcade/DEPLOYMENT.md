# 🚀 DEGN.gg Production Deployment Guide

## Required Environment Variables

### Frontend (Vercel)
Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MATCHMAKER_URL=https://your-matchmaker-url.com
NEXT_PUBLIC_BACKEND_URL=https://your-matchmaker-url.com
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Backend Matchmaker (Render/Railway/Fly.io)
Set these in your hosting platform's environment variables:

```
PORT=3001
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MATCHMAKER_URL=https://your-matchmaker-url.com
MATCHMAKER_WS_URL=wss://your-matchmaker-url.com
FRONTEND_URL=https://degn-gg.vercel.app
ESCROW_PRIVATE_KEY=your-escrow-private-key (optional)
SOLANA_RPC=https://api.devnet.solana.com
```

## Deployment Steps

### 1. Deploy Frontend to Vercel
```bash
cd degn-arcade
vercel --prod
```

### 2. Deploy Matchmaker Backend
The matchmaker requires a persistent WebSocket server. Deploy to:
- **Render.com** (recommended for WebSockets)
- **Railway.app**
- **Fly.io**

**Render.com Setup:**
1. Create new Web Service
2. Connect GitHub repo
3. Root Directory: `backend/matchmaker`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add all environment variables above

### 3. Update Frontend Environment Variables
After matchmaker is deployed, update `NEXT_PUBLIC_MATCHMAKER_URL` in Vercel to point to your matchmaker URL.

## Production URLs

- **Frontend**: https://degn-gg.vercel.app
- **Matchmaker**: https://your-matchmaker-url.com (set in Vercel env vars)

## Verification Checklist

- [ ] Frontend loads at https://degn-gg.vercel.app
- [ ] Matchmaker connects (check browser console for `[Socket] ✅ Connected`)
- [ ] Can create/join lobbies
- [ ] Payments work
- [ ] Games load and sync between two browsers
- [ ] No CORS errors in console
- [ ] No WebSocket connection errors

