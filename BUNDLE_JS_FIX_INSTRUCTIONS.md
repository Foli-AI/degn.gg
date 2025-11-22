# Bundle.js Fix Instructions - Complete Solution

## Problem Summary

The old `bundle.js` file in `public/games/sol-bird-birdmmo/dist/client/bundle.js` contains outdated interceptor logic that:
1. Tries to redirect Socket.IO connections from Vercel to Render
2. Uses old URL `https://degn-gg-1.onrender.com` instead of `https://degn-socket-server.onrender.com`
3. Contains `[DEGN PATCH] BLOCKED Vercel Socket.IO request` interceptor code
4. Is a **static asset** that bypasses Next.js build process

## Root Cause

- **Source code** in `client-game/birdmmo/` has the correct `Network.js` with `SERVER_URL = "https://degn-socket-server.onrender.com"`
- **But** this source is **never built** during Vercel deployment
- **Old bundle.js** in `public/` is served as a static file, bypassing the build
- **Old index.html** files contain interceptor logic

## Solution Implemented

### 1. Build Script Created ✅
**File:** `degn-arcade/scripts/build-birdmmo.cjs`

**What it does:**
- Builds `client-game/birdmmo/` using webpack
- Copies output to `public/games/sol-bird-birdmmo/dist/client/`
- Creates clean `index.html` without interceptor logic
- Verifies `Network.js` has production socket URL

### 2. Package.json Updated ✅
**File:** `degn-arcade/package.json`

**Changes:**
```json
"scripts": {
  "build:birdmmo": "node scripts/build-birdmmo.cjs",
  "prebuild": "npm run build:birdmmo",
  "build": "next build",
  ...
}
```

**How it works:**
- `prebuild` hook runs **before** `next build`
- Ensures BirdMMO is built before Next.js build
- New bundle.js replaces old static bundle.js

### 3. Webpack Config Updated ✅
**File:** `client-game/birdmmo/webpack.common.js`

**Change:**
```javascript
output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist'),
    clean: true, // Clean output directory before build
},
```

### 4. Old Interceptor Logic Removed ✅
**File:** `degn-arcade/public/games/sol-bird/client/index.html`

**Before:** 148 lines with interceptor scripts
**After:** Clean HTML without any interceptor logic

## Build Process Flow

```
1. npm run build (or vercel --prod)
   ↓
2. prebuild hook runs
   ↓
3. npm run build:birdmmo
   ↓
4. Builds client-game/birdmmo/ → dist/
   ↓
5. Copies to public/games/sol-bird-birdmmo/dist/client/
   ↓
6. Creates clean index.html
   ↓
7. next build runs
   ↓
8. Next.js serves public/ files (including new bundle.js)
```

## Verification Checklist

After deployment, verify in browser console:

- [ ] ✅ No `[DEGN PATCH]` console messages
- [ ] ✅ No `BLOCKED Vercel Socket.IO request` errors
- [ ] ✅ Socket connects to `https://degn-socket-server.onrender.com`
- [ ] ✅ Network.js uses `SERVER_URL = "https://degn-socket-server.onrender.com"`
- [ ] ✅ No 404 errors for `/socket.io`

## Files Modified

1. ✅ `degn-arcade/scripts/build-birdmmo.cjs` (NEW)
2. ✅ `degn-arcade/package.json` (updated scripts)
3. ✅ `client-game/birdmmo/webpack.common.js` (added clean: true)
4. ✅ `degn-arcade/public/games/sol-bird/client/index.html` (removed interceptor)

## Files That Will Be Replaced

After next build, these will be replaced:
- `public/games/sol-bird-birdmmo/dist/client/bundle.js` (old → new)
- `public/games/sol-bird-birdmmo/dist/client/index.html` (old → new)

## Testing Locally

```bash
cd degn-arcade
npm run build:birdmmo  # Test build script
npm run build          # Full build (includes BirdMMO)
```

## Deployment

The fix is automatic:
1. Push to GitHub
2. Vercel runs `npm run build`
3. `prebuild` hook runs `build:birdmmo`
4. New bundle.js is created
5. Next.js serves the new bundle.js

**No manual steps required!**

## Troubleshooting

### Build fails with "Source directory not found"
- Ensure `client-game/birdmmo/` exists
- Check that `Network.js` is in `client-game/birdmmo/`

### Bundle.js still has old code
- Clear `.next` directory: `rm -rf .next`
- Clear `client-game/birdmmo/dist`: `rm -rf client-game/birdmmo/dist`
- Rebuild: `npm run build`

### Socket still connects to wrong URL
- Check `client-game/birdmmo/Network.js` has `SERVER_URL = "https://degn-socket-server.onrender.com"`
- Verify build script copied the correct bundle.js
- Check browser console for actual connection URL

## Summary

✅ **Build script created** - Automatically builds BirdMMO before Next.js build
✅ **Interceptor logic removed** - Clean HTML files
✅ **Production URL configured** - `Network.js` uses `degn-socket-server.onrender.com`
✅ **Automatic deployment** - No manual steps needed

The next Vercel deployment will:
1. Build `client-game/birdmmo/` with correct `Network.js`
2. Copy new bundle.js to `public/games/sol-bird-birdmmo/dist/client/`
3. Serve the new bundle.js (no interceptor, correct socket URL)
4. Socket.IO will connect directly to `https://degn-socket-server.onrender.com`

**Problem solved!** 🎉

