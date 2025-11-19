# 🎮 Testing in Editor vs HTML5 Export

## Important: F5 in Editor ≠ HTML5 Mode

When you press **F5** in Godot Editor, it runs in **desktop mode**, NOT HTML5 mode. This means:
- `OS.has_feature("javascript")` returns `false`
- The HTML5 skip code won't run
- Menus will appear (this is **normal**)

## ✅ Expected Behavior:

### In Godot Editor (F5):
- Shows menus (title screen, name entry, server browser)
- `[MatchBridge] MatchBridge initialized - desktop mode (no polling)` ← **This is correct**
- This is **normal** - you're testing desktop mode

### In HTML5 Export (Browser):
- Skips menus automatically
- `[MatchBridge] MatchBridge initialized - polling for backend events` ← Should say this
- Loads world scene directly
- Gets username from URL query params

---

## 🚨 Still Need to Fix:

### 1. Remove ObstacleSpawner Error

**Action:**
1. Open Godot Editor
2. Open scene: `res://client/world/world.tscn`
3. In Scene tree, find **"ObstacleSpawner"** node
4. **Right-click** → **Delete Node(s)**
5. **Save scene** (Ctrl+S)

**Also remove from world.gd:**
1. Open `res://client/world/world.gd`
2. Find line 8: `onready var obstacle_spawner := $ObstacleSpawner`
3. **Delete that line**
4. **Save** (Ctrl+S)

---

## 🧪 How to Test World Scene Directly in Editor:

If you want to test the world scene without menus:

**Option 1: Change Main Scene**
1. Go to **Project → Project Settings**
2. Click **"Application"** → **"Run"**
3. Change **"Main Scene"** to: `res://client/world/world.tscn`
4. Press **F5** - will load world directly
5. **Remember to change it back** to `res://common/main.tscn` after testing!

**Option 2: Run Scene Directly**
1. Open `res://client/world/world.tscn` in editor
2. Click the **Play Scene** button (▶️ next to scene name)
3. This runs just the world scene

---

## ✅ What to Do Next:

1. **Remove ObstacleSpawner** (fix the error)
2. **Export as HTML5:**
   - Project → Export → HTML5
   - Export to: `degn-arcade/public/games/sol-bird/client/`
3. **Test in Browser:**
   - Load the game from your Next.js app
   - Check browser console
   - Should see: `[MatchBridge] MatchBridge initialized - polling for backend events`
   - Should see: `[ClientNetwork] HTML5 mode: Skipping menus, loading world scene directly`
   - Game should load world scene (not menus)

---

## 📋 Checklist:

- [ ] Remove ObstacleSpawner node from `world.tscn`
- [ ] Remove `onready var obstacle_spawner` from `world.gd`
- [ ] Export HTML5 build
- [ ] Test in browser (not F5 in editor)
- [ ] Verify world scene loads (not menus)
- [ ] Check browser console for correct messages

---

## 🎯 Summary:

**F5 in Editor = Desktop Mode = Shows Menus** ← This is **normal**  
**HTML5 Export in Browser = HTML5 Mode = Skips Menus** ← This is what we want

The HTML5 skip code will **only work** when exported and run in a browser!

