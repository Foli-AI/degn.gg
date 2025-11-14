# 🚀 DEGN Arcade Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (free tier works)
- GitHub repository connected to Vercel
- All environment variables configured

### Step 1: Set Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add the following variables:

#### Required Variables

| Variable Name | Example Value | Description |
|--------------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase anonymous key (public) |
| `NEXT_PUBLIC_MATCHMAKER_URL` | `https://your-matchmaker-url.com` | Deployed matchmaker backend URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase service role key (server-only) |

#### Optional Variables

| Variable Name | Example Value | Description |
|--------------|---------------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://your-matchmaker-url.com` | Alternative to MATCHMAKER_URL |
| `NEXT_PUBLIC_SOLANA_RPC` | `https://api.devnet.solana.com` | Solana RPC endpoint (defaults to devnet) |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` | Solana network (devnet/mainnet) |

**Important Notes:**
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` should NOT have `NEXT_PUBLIC_` prefix (server-only)
- Set variables for **Production**, **Preview**, and **Development** environments as needed

### Step 2: Deploy to Vercel

```bash
cd degn-arcade
npm run build  # Verify build succeeds
vercel --prod  # Deploy to production
```

Or use the helper script:
```bash
chmod +x scripts/deploy-helper.sh
./scripts/deploy-helper.sh
```

### Step 3: Verify Deployment

1. Visit your Vercel deployment URL (e.g., `https://degn-gg.vercel.app`)
2. Open browser console (F12)
3. Check for connection logs: `[Socket] ✅ Connected to matchmaker`
4. Test lobby creation and game loading

---

## Backend Matchmaker Deployment

The matchmaker requires a persistent WebSocket server. Vercel does not support long-lived WebSocket connections, so deploy to one of these platforms:

### Option 1: Render.com (Recommended)

**Pros:** Free tier, easy WebSocket support, auto-deploy from GitHub

#### Setup Steps:

1. **Create Account**: Sign up at [render.com](https://render.com)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**:
   - **Name**: `degn-matchmaker`
   - **Root Directory**: `backend/matchmaker`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier works for development

4. **Set Environment Variables** in Render Dashboard:

   | Variable Name | Example Value |
   |--------------|---------------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
   | `MATCHMAKER_URL` | `https://degn-matchmaker.onrender.com` |
   | `MATCHMAKER_WS_URL` | `wss://degn-matchmaker.onrender.com` |
   | `FRONTEND_URL` | `https://degn-gg.vercel.app` |
   | `SOLANA_RPC` | `https://api.devnet.solana.com` |
   | `ESCROW_PRIVATE_KEY` | `[123,45,67,...]` (optional) |

5. **Deploy**: Render will automatically deploy on push to main branch

6. **Get Your Matchmaker URL**: 
   - Render provides a URL like `https://degn-matchmaker.onrender.com`
   - Update `NEXT_PUBLIC_MATCHMAKER_URL` in Vercel with this URL

#### Using render.yaml (Auto-configuration):

The repository includes `backend/matchmaker/render.yaml`. Render will automatically use this configuration if:
- The file is in the root of your repo, OR
- You manually import the service using the YAML file

### Option 2: Railway.app

**Pros:** Free tier, simple setup, good for Node.js apps

#### Setup Steps:

1. **Create Account**: Sign up at [railway.app](https://railway.app)

2. **Create New Project**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Add Service**:
   - Click "+ New" → "GitHub Repo"
   - Select the repository
   - Set **Root Directory** to `backend/matchmaker`

4. **Configure Service**:
   - Railway auto-detects Node.js
   - **Start Command**: `npm start`
   - **Build Command**: `npm install && npm run build`

5. **Set Environment Variables** (same as Render.com above)

6. **Deploy**: Railway auto-deploys on push

7. **Get URL**: Railway provides a URL like `https://degn-matchmaker.up.railway.app`

### Option 3: Fly.io

**Pros:** Global edge deployment, good performance

#### Setup Steps:

1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`

2. **Login**: `fly auth login`

3. **Create App**: `cd backend/matchmaker && fly launch`

4. **Set Secrets**:
   ```bash
   fly secrets set NODE_ENV=production
   fly secrets set PORT=3001
   fly secrets set NEXT_PUBLIC_SUPABASE_URL=...
   # ... (set all env vars)
   ```

5. **Deploy**: `fly deploy`

6. **Get URL**: `fly status` shows your app URL

---

## Production Build Configuration

### Matchmaker Server

The matchmaker uses TypeScript and needs to be compiled before running:

**Development:**
```bash
cd backend/matchmaker
npm run dev  # Uses ts-node
```

**Production:**
```bash
cd backend/matchmaker
npm run build  # Compiles TypeScript to dist/
npm start       # Runs compiled JavaScript
```

**Docker Option** (for platforms that support it):

Create `backend/matchmaker/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

---

## WebSocket Connection Verification

### Testing from Deployed Frontend

1. **Open Browser Console** on your deployed frontend
2. **Look for these logs**:
   ```
   [Socket] ✅ Connected to matchmaker: <socket-id>
   ```
3. **If connection fails**, check:
   - `NEXT_PUBLIC_MATCHMAKER_URL` is set correctly in Vercel
   - Matchmaker server is running and accessible
   - CORS is configured to allow your Vercel domain
   - WebSocket URL uses `wss://` (not `ws://`) in production

### Common Issues

#### Issue: "Connection timeout"
- **Cause**: Matchmaker server not running or URL incorrect
- **Fix**: Verify matchmaker is deployed and `NEXT_PUBLIC_MATCHMAKER_URL` points to it

#### Issue: "CORS error"
- **Cause**: Matchmaker CORS not allowing Vercel domain
- **Fix**: Add your Vercel URL to matchmaker's `allowedOrigins` in `server.ts`

#### Issue: "WebSocket connection failed"
- **Cause**: Using `ws://` instead of `wss://` in production
- **Fix**: Ensure `MATCHMAKER_WS_URL` uses `wss://` protocol

#### Issue: "404 on /ws endpoint"
- **Cause**: WebSocket upgrade not handled correctly
- **Fix**: Verify matchmaker server handles HTTP upgrade requests

---

## Environment Variable Checklist

### Frontend (Vercel) ✅
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_MATCHMAKER_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SOLANA_RPC` (optional)

### Backend (Render/Railway/Fly.io) ✅
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MATCHMAKER_URL` (your deployed matchmaker URL)
- [ ] `MATCHMAKER_WS_URL` (wss:// version of MATCHMAKER_URL)
- [ ] `FRONTEND_URL` (your Vercel deployment URL)
- [ ] `SOLANA_RPC`
- [ ] `ESCROW_PRIVATE_KEY` (optional)

---

## Post-Deployment Verification

1. ✅ Frontend loads at Vercel URL
2. ✅ Browser console shows `[Socket] ✅ Connected to matchmaker`
3. ✅ Can create/join lobbies
4. ✅ Payments work (if configured)
5. ✅ Games load in iframe
6. ✅ Multiplayer sync works between two browser tabs
7. ✅ No CORS errors in console
8. ✅ No WebSocket connection errors

---

## Support

If deployment fails:
1. Check build logs in Vercel/Render dashboard
2. Verify all environment variables are set
3. Check browser console for connection errors
4. Verify matchmaker server logs for startup errors
5. Ensure WebSocket URL uses correct protocol (wss:// in production)

