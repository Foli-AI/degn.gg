# 🎮 Godot Integration - Required Changes

**Status:** Reviewing files | Preparing updated scripts

---

## 📋 **What I Found**

### ✅ **Already Good:**
1. `match_bridge.gd` exists and polls `window.latestMatchEvent` ✅
2. `common/world/world.gd` has `_on_match_game_start`, `_on_match_player_update`, `_on_match_game_end` handlers ✅
3. `player.gd` has `finish()` function that emits `finish` signal ✅
4. Coins are tracked and `coins_changed` signal is emitted ✅

### ⚠️ **What Needs to Change:**

1. **Remove Godot's Built-in Multiplayer**
   - Currently uses `WebSocketClient` for peer-to-peer
   - We need to use our backend WebSocket via `ws-glue.js` instead
   - Bypass Godot's multiplayer system entirely

2. **Send Coin Updates to Backend**
   - When coins change, call `window.sendCoinUpdate(coins)`
   - Currently only emits local signal

3. **Send Finish Order to Backend**
   - When player finishes, send to backend via WebSocket
   - Track finish order (1st, 2nd, 3rd)
   - Send rankings array when all players finish

4. **Handle Match Payload from Backend**
   - Load players from `GAME_START` event
   - Get `maxPlayers`, `entryFee`, `pot` from backend
   - Don't use Godot's lobby system

5. **Game End Logic**
   - When all players finish OR timer expires → send rankings
   - Show leaderboard from backend `GAME_END` event

---

## 🔧 **Files I'll Update**

1. **`common/world/world.gd`**
   - Remove Godot multiplayer dependency
   - Add finish order tracking
   - Send rankings to backend when all finish
   - Handle `GAME_START` payload properly

2. **`common/world/player/player.gd`**
   - Call `window.sendCoinUpdate(coins)` when coins change
   - Send `FINISH` event to backend when player finishes

3. **`client/world/world.gd`**
   - Remove multiplayer sync code
   - Use match_bridge events instead
   - Handle finish order display

4. **`net/match_bridge.gd`**
   - Already good! Just verify it works

5. **`client/client_network.gd`**
   - May need to bypass or disable for HTML5 export

---

## 📝 **New Functions Needed**

### **In `common/world/world.gd`:**
- `send_finish_event(player_id, place)` - Send finish to backend
- `send_rankings_to_backend()` - Send final rankings
- `handle_all_players_finished()` - When all finish, send results

### **In `common/world/player/player.gd`:**
- `send_coin_update()` - Call `window.sendCoinUpdate(coins)`
- `send_finish_event()` - Send finish to backend

---

## 🚀 **Next Steps**

1. **I'll create updated scripts** with all changes
2. **You'll copy them** into your Godot project
3. **Test in Godot editor** (check for errors)
4. **Export as HTML5** to `public/games/sol-bird/client/`
5. **Test end-to-end** with backend

**Let me create the updated scripts now!**

