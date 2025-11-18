# ✅ Post-Deployment Steps

## 🎉 Matchmaker is Deployed!

Now you need to connect your Vercel frontend to the deployed matchmaker.

## Step 1: Get Your Matchmaker URL from Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your `degn-matchmaker` service
3. Copy the URL shown at the top (e.g., `https://degn-matchmaker.onrender.com`)
4. **Note this URL** - you'll need it for Vercel

## Step 2: Update Render Environment Variables

In Render Dashboard → Your Service → Environment:

1. Update `MATCHMAKER_URL` = `https://degn-matchmaker.onrender.com` (your actual URL)
2. Update `MATCHMAKER_WS_URL` = `wss://degn-matchmaker.onrender.com` (use `wss://` for WebSocket)

**Important**: Replace `http://` with `wss://` for the WebSocket URL!

## Step 3: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`degn-gg` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_MATCHMAKER_URL` | `https://degn-matchmaker.onrender.com` (your Render URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (server-only) |

5. **Redeploy** your Vercel app:
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment → **Redeploy**
   - OR push a new commit to trigger auto-deploy

## Step 4: Verify Matchmaker is Running

Test the matchmaker API:

```powershell
# Test health endpoint
curl https://degn-matchmaker.onrender.com/health

# Should return JSON like:
# {"status":"healthy","timestamp":"...","stats":{...}}
```

Or open in browser: `https://degn-matchmaker.onrender.com/health`

## Step 5: Test Frontend Connection

1. Open your Vercel deployment: `https://degn-gg.vercel.app` (or your URL)
2. Open browser console (F12)
3. Look for connection logs:
   - ✅ `[Socket] ✅ Connected to matchmaker: <socket-id>` = SUCCESS!
   - ❌ `[Socket] Connection error: timeout` = Check URLs and CORS

## Step 6: Test Full Flow

1. **Create a Lobby:**
   - Go to `/find-game`
   - Select a game (e.g., Sol Bird)
   - Click "Create Lobby"

2. **Join from Another Browser/Tab:**
   - Open the same URL in another tab or browser
   - Join the same lobby
   - Both should see each other

3. **Test Game Start:**
   - Complete payment flow (if configured)
   - Game should start when both players ready

## 🔍 Troubleshooting

### If Frontend Can't Connect:

1. **Check Browser Console:**
   - Look for WebSocket connection errors
   - Check if `NEXT_PUBLIC_MATCHMAKER_URL` is correct

2. **Verify Matchmaker URL:**
   ```powershell
   # Test if matchmaker is accessible
   curl https://degn-matchmaker.onrender.com/health
   ```

3. **Check CORS:**
   - In Render logs, check for CORS errors
   - Verify `FRONTEND_URL` in Render matches your Vercel URL

4. **Check WebSocket URL:**
   - Ensure `MATCHMAKER_WS_URL` uses `wss://` (not `ws://`)
   - Production requires `wss://` for secure WebSocket

### If Matchmaker Shows Errors:

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for startup errors or runtime errors

2. **Verify Environment Variables:**
   - All required vars are set in Render
   - `SUPABASE_SERVICE_ROLE_KEY` is correct
   - `FRONTEND_URL` matches your Vercel domain

## ✅ Success Checklist

- [ ] Matchmaker URL obtained from Render
- [ ] `MATCHMAKER_URL` and `MATCHMAKER_WS_URL` set in Render
- [ ] `NEXT_PUBLIC_MATCHMAKER_URL` set in Vercel
- [ ] Vercel app redeployed
- [ ] Matchmaker health endpoint returns 200
- [ ] Frontend console shows: `[Socket] ✅ Connected to matchmaker`
- [ ] Can create/join lobbies
- [ ] Multiplayer sync works between two browsers

## 🎯 Next: Test Multiplayer

Once everything is connected:

1. Open two browser windows
2. Both go to your Vercel URL
3. Create/join the same lobby
4. Test that both players see each other
5. Test game start and multiplayer sync

## 📝 Summary

**What You've Accomplished:**
- ✅ Code pushed to GitHub
- ✅ Matchmaker deployed to Render
- ✅ TypeScript build working
- ✅ Server starting correctly

**What's Next:**
- 🔗 Connect frontend to matchmaker (Vercel env vars)
- 🧪 Test full multiplayer flow
- 🎮 Start playing!

Your matchmaker is live! Just connect the frontend and you're ready to go! 🚀

