# 🚨 CRITICAL FIX: Indentation Error in client_network.gd

## Problem
The `_ready()` function has **incorrect indentation**, causing "Unexpected Token: else:" error.

## Solution

**Open file:** `res://client/client_network.gd` in Godot Editor

**Scroll to line 35** (the `_ready()` function)

**FIND lines 52-70:**
```gdscript
	# Register with the Network singleton so this node can be easily accessed
	Network.Client = self

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

**REPLACE with this (properly indented with TABS):**
```gdscript
	# Register with the Network singleton so this node can be easily accessed
	Network.Client = self

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

## Key Changes:
1. **Line 52 comment** - Added one tab indentation (inside `_ready()`)
2. **Line 53 `if OS.has_feature`** - Added one tab indentation (inside `_ready()`)
3. **Line 54 comment** - Added two tabs (inside the `if` block)
4. **Line 55 `var username`** - Added two tabs (inside the `if` block)
5. **Line 56 `if username`** - Added two tabs (inside the `if OS.has_feature` block)
6. **Lines 57-62** - Properly indented with three tabs (inside nested `if`)
7. **Lines 64-67** - Properly indented with two tabs (inside `if OS.has_feature` block)
8. **Line 68 `else:`** - Added one tab (matches the `if OS.has_feature` at same level)
9. **Line 70** - Properly indented with two tabs (inside `else` block)

## How to Fix in Godot:

1. Open Godot Editor
2. Open `res://client/client_network.gd`
3. Select lines 52-70
4. Delete them
5. Paste the corrected version above
6. **IMPORTANT:** Make sure you're using **TABS** (press Tab key), not spaces
7. Save the file (Ctrl+S)
8. The error should disappear

## Verify:
After saving, check the **Output** panel in Godot - there should be no parse errors.

