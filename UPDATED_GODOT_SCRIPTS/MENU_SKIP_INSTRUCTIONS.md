# 🎮 Menu Skip Instructions

**Status:** ✅ Scripts updated | Ready to implement

---

## ✅ **Fixed Issues**

### **1. Timer Type Error** ✅
**Problem:** `var round_end_timer := null` caused parse error

**Fix:** Changed to `var round_end_timer: Timer = null`

**File:** `UPDATED_GODOT_SCRIPTS/world_common.gd` (line 38)

---

### **2. Menu Skip & Username from Backend** ✅
**Problem:** Game shows main menu, asks for username, asks singleplayer/multiplayer

**Fix:** 
- Skip all menus in HTML5 mode
- Get username from URL query params (`?username=...`)
- Go straight to world scene
- Wait for `GAME_START` event from backend

**File:** `UPDATED_GODOT_SCRIPTS/client_network.gd`

---

## 📋 **What Changed**

### **`client/client_network.gd`**

**New Behavior:**
1. **HTML5 Mode Detection:**
   - Checks `OS.has_feature("javascript")` 
   - Only skips menus in HTML5 export (not in editor)

2. **Username from Query Params:**
   - Gets `username` from URL: `?username=PlayerName`
   - Sets `Globals.player_name = username`
   - Falls back to "Player" if no username provided

3. **Skip Menus:**
   - Skips title screen
   - Skips lobby browser
   - Skips setup screen
   - Goes directly to `world_scene`
   - World waits for `GAME_START` event from backend

4. **Desktop Mode:**
   - Still shows normal menu flow (for testing)

---

## 🔧 **Implementation Steps**

### **Step 1: Update `client/client_network.gd`**
1. Open your Godot project
2. Navigate to `client/client_network.gd`
3. **Backup the file**
4. Open `UPDATED_GODOT_SCRIPTS/client_network.gd`
5. Copy all contents
6. Paste into `client/client_network.gd`
7. Save (Ctrl+S)

### **Step 2: Update `common/world/world.gd`**
1. Navigate to `common/world/world.gd`
2. **Backup the file**
3. Open `UPDATED_GODOT_SCRIPTS/world_common.gd`
4. Copy all contents
5. Paste into `common/world/world.gd`
6. Save (Ctrl+S)

### **Step 3: Verify Query Params**
The frontend already passes `username` in the URL:
```
/games/sol-bird/client/index.html?username=PlayerName&playerId=...&matchKey=...
```

The game will automatically:
- Extract `username` from URL
- Set `Globals.player_name = username`
- Use it for player display

---

## 🎯 **How It Works**

### **Flow:**
1. **User clicks "Find Game"** on DEGN.gg
2. **Frontend loads game** with query params:
   ```
   ?username=PlayerName&playerId=123&matchKey=abc&wsUrl=...
   ```
3. **Godot game loads** (HTML5 export)
4. **`client_network.gd` detects HTML5 mode:**
   - Gets `username` from query params
   - Sets `Globals.player_name = username`
   - Skips all menus
   - Loads world scene directly
5. **World scene waits** for `GAME_START` event from backend
6. **Backend sends `GAME_START`** when match starts
7. **Game spawns players** and starts race

---

## ✅ **Testing Checklist**

After implementing:

- [ ] Game loads directly to world scene (no menu)
- [ ] Username is set from query params
- [ ] No "Enter Name" screen
- [ ] No "Singleplayer/Multiplayer" selection
- [ ] World scene loads and waits for `GAME_START`
- [ ] Players spawn when backend sends `GAME_START`
- [ ] Username displays correctly in game

---

## 🐛 **Troubleshooting**

### **Error: "username is null"**
- **Fix:** Check that frontend passes `username` in URL
- Verify: `?username=PlayerName` is in the iframe src

### **Error: "Menu still shows"**
- **Fix:** Make sure you're testing HTML5 export, not editor
- Editor mode still shows menus (by design)
- Export as HTML5 and test in browser

### **Error: "World doesn't load"**
- **Fix:** Check that `world_scene` path is correct
- Should be: `res://client/world/world.tscn`
- Verify the scene exists

### **Error: "Username not set"**
- **Fix:** Check browser console for JavaScript errors
- Verify `_get_query_param()` function works
- Test with: `?username=TestPlayer` in URL

---

## 📝 **Notes**

1. **Editor vs HTML5:**
   - Editor mode: Shows menus (for testing)
   - HTML5 export: Skips menus (for production)

2. **Username Source:**
   - Comes from DEGN.gg user account
   - Passed via URL query params
   - Falls back to "Player" if missing

3. **Backend Integration:**
   - Game waits for `GAME_START` event
   - No need to connect to Godot's multiplayer
   - Uses `match_bridge` for backend events

---

## 🚀 **Next Steps**

1. **Implement the changes** (update both files)
2. **Test in Godot editor** (should still show menus - that's OK)
3. **Export as HTML5** to `public/games/sol-bird/client/`
4. **Test in browser** - should skip menus and use username from URL
5. **Verify backend integration** - game should wait for `GAME_START`

**Good luck! Let me know when you've implemented! 🎮**

