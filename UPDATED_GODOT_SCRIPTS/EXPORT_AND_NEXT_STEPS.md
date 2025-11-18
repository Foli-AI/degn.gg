# 🚀 Export & Next Steps Guide

**Status:** Ready to export | Step-by-step instructions

---

## 📋 **Step 1: Export Game as HTML5**

### **1.1. Open Export Dialog**
1. Open your Godot project
2. Go to **Project → Export**
3. You should see export presets (if any exist)

### **1.2. Add/Configure HTML5 Export Preset**
1. Click **Add...** button (top right)
2. Select **Web** from the list
3. Name it: `Sol Bird HTML5` (or whatever you want)

### **1.3. Configure Export Settings**

**General Tab:**
- **Export Path:** Click folder icon
- Navigate to: `C:\Users\mojo\Documents\degn\degn-arcade\public\games\sol-bird\client\`
- **File name:** `index.html`
- **Full path should be:** `C:\Users\mojo\Documents\degn\degn-arcade\public\games\sol-bird\client\index.html`
- **Variant:** Release
- **Debug:** Disabled

**HTML Tab:**
- **Canvas Resize Policy:** Project
- **Custom HTML Shell:** (leave default)
- **Threads:** Enabled ✅
- **Audio Worklet:** Enabled ✅
- **GZip Compression:** Disabled (for easier debugging)
- **FileSystem Access:** Virtualized
- **Use WebGL2:** Enabled ✅
- **Use WebGL1 Fallback:** Enabled ✅

**Resources Tab:**
- **Export Mode:** Export all resources in the project ✅
- **Keep "Shared"** on by default ✅

**Features Tab:**
- **Custom:** (leave default)

### **1.4. Export the Game**
1. Click **Export Project...** button
2. Navigate to: `C:\Users\mojo\Documents\degn\degn-arcade\public\games\sol-bird\client\`
3. **File name:** `index.html`
4. Click **Save**
5. **Wait for export to complete** (may take 1-2 minutes)
6. You should see: `Exporting project...` progress bar

### **1.5. Verify Export**
1. Navigate to: `degn-arcade\public\games\sol-bird\client\`
2. Check that these files exist:
   - ✅ `index.html`
   - ✅ `sol-bird.wasm` (or similar .wasm file)
   - ✅ `sol-bird.pck` (or similar .pck file)
   - ✅ Other game files

---

## 📋 **Step 2: Verify ws-glue.js Injection**

### **2.1. Check Postbuild Script**
The `postbuild` script should automatically inject `ws-glue.js` into `index.html`.

**Verify:**
1. Open `degn-arcade\package.json`
2. Check that `"postbuild"` script exists:
   ```json
   "postbuild": "node scripts/patch-sol-bird-index.cjs"
   ```

### **2.2. Manually Verify (Optional)**
1. Open `degn-arcade\public\games\sol-bird\client\index.html`
2. Search for `ws-glue.js`
3. Should see: `<script src="./ws-glue.js"></script>` before `</body>`

**If NOT there:**
1. Run: `cd degn-arcade && npm run build`
2. Or manually add: `<script src="./ws-glue.js"></script>` before `</body>`

---

## 📋 **Step 3: Test Locally**

### **3.1. Start Backend**
1. Open terminal
2. Navigate to: `cd backend/matchmaker`
3. Run: `npm run dev`
4. Should see: `Server running on port 3001` (or similar)

### **3.2. Start Frontend**
1. Open **new terminal**
2. Navigate to: `cd degn-arcade`
3. Run: `npm run dev`
4. Should see: `Ready on http://localhost:3000`

### **3.3. Test Game Load**
1. Open browser: `http://localhost:3000`
2. Navigate to: `/find-game` or `/play/sol-bird`
3. Create/join a lobby
4. Game should load in iframe
5. Check browser console (F12) for:
   - ✅ WebSocket connection messages
   - ✅ `[ws-glue]` log messages
   - ❌ No errors

---

## 📋 **Step 4: Test Full Flow**

### **4.1. Create Test Lobby**
1. Go to `/find-game`
2. Select "Sol Bird" game
3. Select entry tier (0.1 SOL, 0.5 SOL, etc.)
4. Click "Find Game" or "Join Lobby"
5. Pay entry fee (if required)

### **4.2. Verify Game Starts**
1. Game should load in iframe
2. Should see game world (not menu)
3. Check browser console:
   - ✅ `"World ready!"` message
   - ✅ `"Using username from query params: ..."`
   - ✅ WebSocket connected

### **4.3. Test Gameplay**
1. Wait for `GAME_START` event from backend
2. Players should spawn
3. Game should start
4. Test coin collection (check backend logs for `COIN_UPDATE`)
5. Test finish (check backend logs for `FINISH` event)

### **4.4. Test Match End**
1. All players finish OR timer expires
2. Backend should receive `MATCH_RESULT` with rankings
3. Backend should send `GAME_END` event
4. Game should show leaderboard

---

## 📋 **Step 5: Fix Issues (If Any)**

### **Common Issues:**

#### **Issue 1: "Game doesn't load"**
**Check:**
- ✅ `index.html` exists in correct location
- ✅ `ws-glue.js` is injected
- ✅ Browser console for errors
- ✅ Network tab for failed file loads

**Fix:**
- Re-export game
- Check file paths
- Verify `postbuild` script ran

---

#### **Issue 2: "WebSocket not connecting"**
**Check:**
- ✅ Backend is running
- ✅ `wsUrl` query param is correct
- ✅ Browser console for WebSocket errors

**Fix:**
- Verify backend URL in frontend
- Check `MATCHMAKER_URL` environment variable
- Test WebSocket URL manually

---

#### **Issue 3: "Username not set"**
**Check:**
- ✅ `username` query param in URL
- ✅ Browser console for JavaScript errors
- ✅ `_get_query_param()` function works

**Fix:**
- Verify frontend passes `username` in iframe src
- Check `client_network.gd` script
- Test with: `?username=TestPlayer` in URL

---

#### **Issue 4: "Game shows menu"**
**Check:**
- ✅ Testing HTML5 export (not editor)
- ✅ `OS.has_feature("javascript")` returns true
- ✅ `client_network.gd` updated correctly

**Fix:**
- Make sure you're testing exported HTML5, not editor
- Verify script changes were saved
- Check Output panel for errors

---

#### **Issue 5: "MatchBridge not found"**
**Check:**
- ✅ MatchBridge autoload in Project Settings
- ✅ `net/match_bridge.gd` file exists
- ✅ Browser console for errors

**Fix:**
- Add MatchBridge autoload (Project → Project Settings → Autoload)
- Verify file path: `res://net/match_bridge.gd`

---

## 📋 **Step 6: Deploy to Production**

### **6.1. Commit Changes**
1. Stage all files:
   ```bash
   git add .
   ```
2. Commit:
   ```bash
   git commit -m "Add Sol Bird game integration"
   ```
3. Push:
   ```bash
   git push origin main
   ```

### **6.2. Deploy Backend (Render)**
1. Go to Render dashboard
2. Backend should auto-deploy (if connected to GitHub)
3. Or manually trigger deploy
4. Verify backend is running

### **6.3. Deploy Frontend (Vercel)**
1. Go to Vercel dashboard
2. Frontend should auto-deploy (if connected to GitHub)
3. Or manually trigger deploy
4. Verify frontend is live

### **6.4. Test Production**
1. Visit your live site
2. Test full flow:
   - Create lobby
   - Join game
   - Play match
   - Verify payouts

---

## 📋 **Step 7: Next Features to Build**

### **7.1. Frontend Tier Selection UI** (I'll do this)
- Replace custom lobby creation with tier buttons
- Show current lobbies at each tier
- Auto-join after payment

### **7.2. Backend: Handle FINISH Events**
- Update backend to handle `FINISH` events from game
- Track finish order
- Calculate rankings

### **7.3. Backend: Handle MATCH_RESULT**
- Process rankings from game
- Calculate Top 3 payouts
- Send payouts + house rake

### **7.4. Testing**
- End-to-end testing
- Multiple players
- Edge cases (disconnects, timeouts, etc.)

---

## ✅ **Quick Checklist**

Before deploying:

- [ ] Game exported as HTML5 to correct location
- [ ] `ws-glue.js` injected into `index.html`
- [ ] Backend running locally
- [ ] Frontend running locally
- [ ] Game loads in browser
- [ ] WebSocket connects
- [ ] Username from query params works
- [ ] Game skips menus
- [ ] Players spawn on `GAME_START`
- [ ] Coins update backend
- [ ] Finish events sent to backend
- [ ] Rankings sent when all finish
- [ ] No errors in console

---

## 🚀 **Summary**

**Right Now:**
1. ✅ Export game as HTML5
2. ✅ Test locally
3. ✅ Fix any issues
4. ✅ Deploy to production

**Next:**
1. I'll update frontend tier selection UI
2. We'll test end-to-end
3. We'll deploy and launch! 🎉

**Let me know when you've exported and we can test together! 🎮**

