# 🚨 FIX: Game Not Loading + ObstacleSpawner Error

## Issues Found:
1. **ObstacleSpawner error** - Node exists but `obstacle_scene` not assigned
2. **MatchBridge detecting desktop mode** - Should detect HTML5
3. **Game not loading** - Gray screen

---

## FIX 1: Remove ObstacleSpawner from Scene

**Action:**
1. Open Godot Editor
2. Open scene: `res://client/world/world.tscn`
3. In the Scene tree (left panel), find **"ObstacleSpawner"** node
4. **Right-click** on it → **Delete Node(s)**
5. **Save the scene** (Ctrl+S)

**Why:** We're using `LevelGenerator` to spawn obstacles, not `ObstacleSpawner`. The ObstacleSpawner is leftover code that's causing errors.

---

## FIX 2: Verify MatchBridge HTML5 Detection

**Action:**
1. Open Godot Editor
2. Open file: `res://net/match_bridge.gd`
3. **Verify** line 14 says: `if OS.has_feature("javascript"):`
4. If it's different, change it to match exactly

**Note:** If MatchBridge still says "desktop mode" after export, it might be a Godot export issue. We'll test after fixing ObstacleSpawner.

---

## FIX 3: Verify Client Network Loads World

**Action:**
1. Open Godot Editor
2. Open file: `res://client/client_network.gd`
3. Scroll to **line 52-67** (the `_ready()` function)
4. **VERIFY** this code exists:

```gdscript
# NEW: In HTML5 mode, skip menus and use backend integration
if OS.has_feature("javascript"):
	# Get username from query params (passed from DEGN.gg frontend)
	var username = _get_query_param("username")
	if username and username != "":
		Globals.player_name = username
		Logger.print(self, "Using username from query params: %s" % username)
	else:
		# Fallback to default if no username provided
		Globals.player_name = "Player"
		Logger.print(self, "No username in query params, using default: Player")
	
	# Skip all menus - go straight to world scene
	# The world will wait for GAME_START event from backend
	Logger.print(self, "HTML5 mode: Skipping menus, loading world scene directly")
	change_scene(world_scene)
else:
	# Desktop mode: show normal menu flow
	change_scene_to_title_screen(false)
```

5. If this code is **NOT there**, add it
6. **Save the file**

---

## FIX 4: Check World Scene Path

**Action:**
1. Open Godot Editor
2. Open file: `res://client/client_network.gd`
3. Scroll to **line 15**
4. **VERIFY** it says: `var world_scene := "res://client/world/world.tscn"`
5. If different, change it to match exactly
6. **Save the file**

---

## FIX 5: Remove ObstacleSpawner Reference from world.gd

**Action:**
1. Open Godot Editor
2. Open file: `res://client/world/world.gd`
3. Scroll to **line 8**
4. **DELETE** this line if it exists:
   ```gdscript
   onready var obstacle_spawner := $ObstacleSpawner
   ```
5. **Save the file**

---

## After All Fixes:

1. **Save all files** (Ctrl+S on each)
2. **Test in Godot Editor:**
   - Press **F5** to run
   - Check **Output** panel for errors
3. **Export HTML5:**
   - Go to **Project → Export**
   - Select **HTML5**
   - Click **Export Project**
   - Export to: `degn-arcade/public/games/sol-bird/client/`
4. **Test in browser:**
   - Load the game
   - Check browser console for errors
   - Game should load world scene (not gray screen)

---

## Expected Console Output (After Fixes):

```
[Globals] Failed to load settings file, using defaults
[Items] Calculating item weights...
[MatchBridge] MatchBridge initialized - polling for backend events  ← Should say "polling"
[ClientNetwork] HTML5 mode: Skipping menus, loading world scene directly  ← Should see this
[ClientNetwork] Using username from query params: Player  ← Or your username
```

**If you still see "desktop mode" after export, the HTML5 export might not be setting the javascript feature correctly. We'll need to check export settings.**

