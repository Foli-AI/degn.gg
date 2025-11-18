# ✅ Quick Setup Checklist

**Status:** Everything should already be set up! Just verify.

---

## 🎯 **5-Minute Verification**

### **1. MatchBridge Autoload** (30 seconds)
- [ ] Open **Project → Project Settings → Autoload**
- [ ] Verify `MatchBridge` is listed:
  ```
  MatchBridge | res://net/match_bridge.gd | ✅
  ```
- [ ] If missing, add it:
  - Path: `res://net/match_bridge.gd`
  - Node Name: `MatchBridge`
  - Enable: ✅

---

### **2. Update Scripts** (2 minutes)
- [ ] Replace `common/world/player/player.gd` with `UPDATED_GODOT_SCRIPTS/player.gd`
- [ ] Replace `common/world/world.gd` with `UPDATED_GODOT_SCRIPTS/world_common.gd`
- [ ] Replace `client/client_network.gd` with `UPDATED_GODOT_SCRIPTS/client_network.gd`

---

### **3. Verify Scene Structure** (1 minute)
- [ ] Open `common/world/world.tscn`
- [ ] Check that `ChunkTracker` node exists (should be there)
- [ ] Open `client/world/world.tscn`
- [ ] Check that `LevelGenerator` node exists (should be there)
- [ ] Check that `UI`, `MainCamera`, etc. exist (should all be there)

---

### **4. Test in Editor** (1 minute)
- [ ] Press **F5** to run
- [ ] Check **Output** panel for errors
- [ ] Should see: `"World ready!"` message
- [ ] No errors about missing nodes

---

### **5. Export as HTML5** (30 seconds)
- [ ] Go to **Project → Export**
- [ ] Select HTML5 preset
- [ ] Export to: `degn-arcade/public/games/sol-bird/client/index.html`
- [ ] Done!

---

## ✅ **That's It!**

**No new nodes needed.**
**No scene structure changes.**
**Just update the 3 scripts and verify autoload.**

**Everything else is already set up correctly! 🎮**

