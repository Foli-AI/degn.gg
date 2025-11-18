# ✅ Next Steps After Successful GitHub Push

## ✅ Completed
- [x] Code pushed to GitHub: `Foli-AI/degn.gg`
- [x] All files including `backend/matchmaker/` are in the repo

## 🚀 Next Steps: Deploy Matchmaker to Render.com

### Step 1: Create Render.com Account
1. Go to [render.com](https://render.com)
2. Sign up (free tier works)
3. Connect your GitHub account

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect repository: **Foli-AI/degn.gg**
3. Select the repository

### Step 3: Configure Service
Fill in these settings:

- **Name**: `degn-matchmaker`
- **Root Directory**: `backend/matchmaker` ⚠️ **IMPORTANT**
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Free (for development)

### Step 4: Set Environment Variables
In Render Dashboard → Environment tab, add:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Your Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your service role key |
| `MATCHMAKER_URL` | `https://degn-matchmaker.onrender.com` | Will be provided by Render |
| `MATCHMAKER_WS_URL` | `wss://degn-matchmaker.onrender.com` | WebSocket URL (wss://) |
| `FRONTEND_URL` | `https://degn-gg.vercel.app` | Your Vercel frontend URL |
| `SOLANA_RPC` | `https://api.devnet.solana.com` | Or testnet/mainnet |
| `ESCROW_PRIVATE_KEY` | `[123,45,67,...]` | Optional, JSON array format |

**Note**: After Render creates your service, it will give you a URL like `https://degn-matchmaker.onrender.com`. Update `MATCHMAKER_URL` and `MATCHMAKER_WS_URL` with this URL.

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Run `npm install && npm run build` in `backend/matchmaker/`
   - Start with `npm start`
3. Wait for deployment to complete (2-5 minutes)

### Step 6: Get Your Matchmaker URL
After deployment succeeds:
- Render provides a URL: `https://degn-matchmaker.onrender.com`
- Copy this URL

### Step 7: Update Vercel Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   - `NEXT_PUBLIC_MATCHMAKER_URL` = `https://degn-matchmaker.onrender.com`
3. Redeploy frontend (or wait for auto-deploy)

### Step 8: Verify Deployment

**Check Matchmaker:**
```powershell
# Test if matchmaker is running
curl https://degn-matchmaker.onrender.com/lobbies
# Should return JSON with lobbies array
```

**Check Frontend Connection:**
1. Open your Vercel deployment: `https://degn-gg.vercel.app`
2. Open browser console (F12)
3. Look for: `[Socket] ✅ Connected to matchmaker: <socket-id>`
4. If you see this, everything is working! ✅

## 🎯 Quick Checklist

- [ ] Render.com account created
- [ ] Web Service created with Root Directory: `backend/matchmaker`
- [ ] Environment variables set in Render
- [ ] Deployment successful (check Render logs)
- [ ] Matchmaker URL obtained: `https://degn-matchmaker.onrender.com`
- [ ] `NEXT_PUBLIC_MATCHMAKER_URL` updated in Vercel
- [ ] Frontend connects to matchmaker (check browser console)

## 🔍 Troubleshooting

**If Render deployment fails:**
- Check build logs in Render dashboard
- Verify `backend/matchmaker/package.json` has correct scripts
- Ensure `tsconfig.json` exists
- Check that `server.ts` exists

**If frontend can't connect:**
- Verify `NEXT_PUBLIC_MATCHMAKER_URL` is set in Vercel
- Check browser console for connection errors
- Verify Render service is running (green status)
- Check CORS settings in matchmaker (should allow Vercel domain)

## 📝 Summary

Your code is now on GitHub! Next:
1. Deploy matchmaker to Render.com
2. Get the matchmaker URL
3. Update Vercel with the matchmaker URL
4. Test the connection

The `render.yaml` file in `backend/matchmaker/` will help Render auto-configure, but you still need to:
- Set Root Directory to `backend/matchmaker`
- Set environment variables manually

