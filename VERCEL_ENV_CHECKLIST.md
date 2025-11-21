# 🔍 VERCEL ENVIRONMENT VARIABLES CHECKLIST

## ✅ CRITICAL: Check These in Vercel Dashboard

Go to your Vercel dashboard → Project → Settings → Environment Variables

### 1. **NEXT_PUBLIC_MATCHMAKER_URL**
- **Value**: `https://degn-gg-1.onrender.com`
- **Environments**: Production, Preview, Development
- **Status**: ✅ MUST BE SET
- **Action**: If missing, ADD IT NOW

### 2. **NEXT_PUBLIC_BACKEND_URL** (Optional fallback)
- **Value**: `https://degn-gg-1.onrender.com`
- **Environments**: Production, Preview, Development
- **Status**: ✅ RECOMMENDED

### 3. **NEXT_PUBLIC_SOCKET_URL** (Optional)
- **Value**: `https://degn-gg-1.onrender.com`
- **Environments**: Production, Preview, Development
- **Status**: ✅ OPTIONAL BUT HELPFUL

## 🚨 HOW TO FIX VERCEL ENV VARS

1. Go to: https://vercel.com/dashboard
2. Select your project: `degn-arcade` or `degn-gg`
3. Go to: Settings → Environment Variables
4. Add/Update:
   - Name: `NEXT_PUBLIC_MATCHMAKER_URL`
   - Value: `https://degn-gg-1.onrender.com`
   - Environments: All (Production, Preview, Development)
5. Click: "Save"
6. **IMPORTANT**: Go to Deployments tab
7. Click: "Redeploy" on latest deployment (or create new deployment)

## 🔧 WHY THIS IS NEEDED

The bundle.js file uses `process.env.NEXT_PUBLIC_MATCHMAKER_URL` to determine where to connect Socket.IO. If this env var is missing, Socket.IO will default to `window.location.origin` (which is Vercel), causing 404 errors.

## ✅ VERIFICATION STEPS

After setting env vars and redeploying:

1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Open console** (F12)
3. **Look for**: `[DEGN PATCH] ✅ Socket.IO patch injected`
4. **Look for**: `[DEGN Network] 🔌 Connecting to Render backend: https://degn-gg-1.onrender.com`
5. **Check Network tab**: Should see requests to `onrender.com`, NOT `vercel.app`

## 🐛 IF STILL NOT WORKING

1. **Clear Vercel cache**: Redeploy with "Clear build cache" option
2. **Check bundle.js**: Open browser console, type `window.location.origin` - should NOT be `vercel.app` (if patch works)
3. **Check actual bundle**: Network tab → bundle.js → Response → Search for "onrender.com" - should find it
4. **Verify deployment**: Check Vercel logs to see if build succeeded
5. **Check Render backend**: Visit `https://degn-gg-1.onrender.com/health` - should return 200 OK

---

**STATUS**: Once you set `NEXT_PUBLIC_MATCHMAKER_URL` in Vercel and redeploy, the 404 errors should stop.

