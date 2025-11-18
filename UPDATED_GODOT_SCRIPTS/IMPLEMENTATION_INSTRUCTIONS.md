# 🎮 Godot Integration - Implementation Instructions

**Status:** ✅ Scripts ready | Ready for you to implement

---

## 📋 **Summary of Changes**

I've created updated scripts that integrate your Godot game with the DEGN.gg backend. Here's what changed:

### **Key Changes:**
1. ✅ **Coin Updates** - Players now send coin counts to backend via `window.sendCoinUpdate()`
2. ✅ **Finish Order Tracking** - Game tracks who finishes 1st, 2nd, 3rd
3. ✅ **Rankings Submission** - When all players finish, rankings are sent to backend
4. ✅ **Backend Integration** - Uses `match_bridge` to receive `GAME_START`, `PLAYER_UPDATE`, `GAME_END` events
5. ✅ **Timer Support** - Handles round timer expiration from backend

---

## 📁 **Files to Update**

### **1. `common/world/player/player.gd`**
**Action:** Replace entire file with `UPDATED_GODOT_SCRIPTS/player.gd`

**Changes:**
- Added `send_coin_update()` function that calls `window.sendCoinUpdate(coins)`
- Added `send_finish_event()` function that sends finish to backend
- Calls `send_coin_update()` when coins change (in `add_coin()` and `death()`)

---

### **2. `common/world/world.gd`**
**Action:** Replace entire file with `UPDATED_GODOT_SCRIPTS/world_common.gd`

**Changes:**
- Added `finish_order` array to track finish order
- Added `next_place` counter for finish positions
- Added `match_start_time` and `round_timer_ms` for timer support
- Added `check_all_players_finished()` to detect when all finish
- Added `send_rankings_to_backend()` to send final rankings
- Added `_on_round_timer_expired()` to handle timer expiration
- Updated `_on_Player_finish()` to track finish order
- Updated `_on_match_game_start()` to handle backend payload
- Updated `_on_match_game_end()` to show backend leaderboard

---

### **3. `public/games/sol-bird/client/ws-glue.js`**
**Action:** Add the two new functions to the existing file

**Location:** In `degn-arcade/public/games/sol-bird/client/ws-glue.js`

**Add after `window.sendCoinUpdate` function:**
```javascript
  // Send finish event when player reaches end
  window.sendFinishEvent = function(finishPlayerId) {
    const payload = {
      type: 'FINISH',
      matchKey,
      playerId: finishPlayerId,
      finishTime: Date.now()
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      console.log('[ws-glue] Sent FINISH event:', finishPlayerId);
    } else {
      pendingSends.push(payload);
      connect();
    }
  };

  // Send match result (rankings) when all players finish or timer expires
  window.sendMatchResult = function(rankings) {
    const payload = {
      type: 'MATCH_RESULT',
      matchKey,
      playerId,
      rankings: rankings
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      console.log('[ws-glue] Sent MATCH_RESULT:', rankings);
    } else {
      pendingSends.push(payload);
      connect();
    }
  };
```

---

## 🔧 **Step-by-Step Implementation**

### **Step 1: Update Player Script**
1. Open your Godot project
2. Navigate to `common/world/player/player.gd`
3. **Backup the file** (copy it somewhere safe)
4. Open `UPDATED_GODOT_SCRIPTS/player.gd` from this folder
5. Copy all contents
6. Paste into `common/world/player/player.gd` in Godot
7. Save (Ctrl+S)

### **Step 2: Update World Script**
1. Navigate to `common/world/world.gd`
2. **Backup the file**
3. Open `UPDATED_GODOT_SCRIPTS/world_common.gd` from this folder
4. Copy all contents
5. Paste into `common/world/world.gd` in Godot
6. Save (Ctrl+S)

### **Step 3: Update ws-glue.js**
1. Open `degn-arcade/public/games/sol-bird/client/ws-glue.js` in your code editor
2. Find the `window.sendCoinUpdate` function (around line 173)
3. Add the two new functions (`sendFinishEvent` and `sendMatchResult`) after it
4. Save the file

### **Step 4: Verify MatchBridge Autoload**
1. In Godot, go to **Project → Project Settings → Autoload**
2. Verify `MatchBridge` is set to `res://net/match_bridge.gd`
3. If not, add it:
   - Path: `res://net/match_bridge.gd`
   - Node Name: `MatchBridge`
   - Enable: ✅

### **Step 5: Test in Godot Editor**
1. Open your main scene
2. Press **F5** to run
3. Check the **Output** panel for any errors
4. Look for messages like:
   - `"World ready!"`
   - `"MatchBridge not found..."` (if not set up)
   - Any script errors

### **Step 6: Export as HTML5**
1. Go to **Project → Export**
2. Select your HTML5 export preset
3. Set export path to: `degn-arcade/public/games/sol-bird/client/index.html`
4. Click **Export Project**
5. Verify `index.html` was created

---

## ⚠️ **Important Notes**

### **1. MatchBridge Autoload**
- The `match_bridge.gd` file must be set as an autoload in Godot
- It should be named `MatchBridge` (capital M, capital B)
- The world script looks for it at `/root/MatchBridge`

### **2. JavaScript Feature Check**
- All backend calls use `OS.has_feature("javascript")` check
- This ensures they only run in HTML5 export, not in editor
- The game will still work in editor, but backend calls will be skipped

### **3. Player ID Format**
- Player IDs are converted to strings: `str(player_id)`
- Backend expects string IDs, not integers
- Make sure player names in Godot match backend player IDs

### **4. Finish Order**
- Finish order is tracked locally in `finish_order` array
- When all players finish OR timer expires, rankings are sent
- Rankings include: `playerId`, `position`, `coins`, `finishTime`

### **5. Timer**
- Round timer is set from backend `GAME_START` payload
- Default is 3 minutes (180000 ms)
- When timer expires, current rankings are sent and game stops

---

## 🐛 **Troubleshooting**

### **Error: "MatchBridge not found"**
- **Fix:** Add `MatchBridge` as autoload in Project Settings
- Path: `res://net/match_bridge.gd`
- Node Name: `MatchBridge`

### **Error: "JavaScript.eval is not available"**
- **Fix:** This is normal in Godot editor
- The functions check `OS.has_feature("javascript")` first
- They will work in HTML5 export

### **Error: "window.sendCoinUpdate is not a function"**
- **Fix:** Make sure `ws-glue.js` is injected into `index.html`
- The `postbuild` script should do this automatically
- Check `degn-arcade/scripts/patch-sol-bird-index.cjs`

### **Players not spawning**
- **Fix:** Check `_on_match_game_start()` handler
- Verify `payload.players` is in correct format
- Check that `player_list` is being set correctly

### **Finish order not working**
- **Fix:** Check `_on_Player_finish()` is being called
- Verify `send_finish_event()` is being called
- Check browser console for WebSocket messages

---

## ✅ **Testing Checklist**

After implementing, test:

- [ ] Game loads in browser
- [ ] WebSocket connects (check browser console)
- [ ] Players spawn from `GAME_START` event
- [ ] Coins update when collected (check backend logs)
- [ ] Finish order tracked when player reaches end
- [ ] Rankings sent when all players finish
- [ ] Timer expires and sends rankings
- [ ] `GAME_END` event shows leaderboard

---

## 🚀 **Next Steps After Implementation**

1. **Test in Godot Editor** - Check for syntax errors
2. **Export as HTML5** - Create `index.html` and game files
3. **Test Locally** - Run backend + frontend, test full flow
4. **Verify Backend** - Check that backend receives:
   - `COIN_UPDATE` messages
   - `FINISH` events
   - `MATCH_RESULT` with rankings
5. **Deploy** - Push to production and test end-to-end

---

## 📞 **Need Help?**

If you encounter issues:
1. Check Godot **Output** panel for errors
2. Check browser **Console** for JavaScript errors
3. Check backend logs for WebSocket messages
4. Verify all files were updated correctly

**Good luck! Let me know when you've implemented the changes! 🎮**

