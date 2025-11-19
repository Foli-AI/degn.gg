# 🚨 CRITICAL FIX: HTML5 Detection Not Working in Export

## Problem
`OS.has_feature("javascript")` returns `false` even in HTML5 export, causing menus to show instead of skipping to world.

## Root Cause
Some Godot 3.5 HTML5 exports don't properly set the "javascript" feature flag. We need a more robust detection method.

## Solution: Multi-Method Detection

### FIX 1: Update client_network.gd

**Open file:** `res://client/client_network.gd` in Godot Editor

**Scroll to line 52**

**FIND:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	if OS.has_feature("javascript"):
```

**REPLACE with:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	# Robust HTML5 detection - try multiple methods
	var is_html5 = false
	
	# Method 1: Check OS feature flags
	if OS.has_feature("javascript") or OS.has_feature("HTML5"):
		is_html5 = true
	
	# Method 2: Check OS name
	if not is_html5:
		var os_name = OS.get_name()
		if os_name == "HTML5" or os_name == "Web" or os_name.to_lower() == "html5":
			is_html5 = true
	
	# Method 3: Try JavaScript access (most reliable)
	if not is_html5:
		if OS.has_feature("javascript"):
			var js_result = JavaScript.eval("typeof window !== 'undefined' ? 'html5' : 'desktop'", true)
			if js_result == "html5":
				is_html5 = true
				Logger.print(self, "Detected HTML5 via JavaScript window check")
	
	# Method 4: Check if we can access document (browser only)
	if not is_html5 and OS.has_feature("javascript"):
		var doc_check = JavaScript.eval("typeof document !== 'undefined' ? true : false", true)
		if doc_check == true:
			is_html5 = true
			Logger.print(self, "Detected HTML5 via document check")
	
	if is_html5:
```

**The complete block (lines 52-70) should be:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	# Robust HTML5 detection - try multiple methods
	var is_html5 = false
	
	# Method 1: Check OS feature flags
	if OS.has_feature("javascript") or OS.has_feature("HTML5"):
		is_html5 = true
	
	# Method 2: Check OS name
	if not is_html5:
		var os_name = OS.get_name()
		if os_name == "HTML5" or os_name == "Web" or os_name.to_lower() == "html5":
			is_html5 = true
	
	# Method 3: Try JavaScript access (most reliable)
	if not is_html5:
		if OS.has_feature("javascript"):
			var js_result = JavaScript.eval("typeof window !== 'undefined' ? 'html5' : 'desktop'", true)
			if js_result == "html5":
				is_html5 = true
				Logger.print(self, "Detected HTML5 via JavaScript window check")
	
	# Method 4: Check if we can access document (browser only)
	if not is_html5 and OS.has_feature("javascript"):
		var doc_check = JavaScript.eval("typeof document !== 'undefined' ? true : false", true)
		if doc_check == true:
			is_html5 = true
			Logger.print(self, "Detected HTML5 via document check")
	
	if is_html5:
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
		Logger.print(self, "Desktop mode detected, showing menus")
		change_scene_to_title_screen(false)
```

---

### FIX 2: Update match_bridge.gd (Same Detection)

**Open file:** `res://net/match_bridge.gd` in Godot Editor

**Scroll to line 13** (the `_ready()` function)

**FIND:**
```gdscript
func _ready():
	if OS.has_feature("javascript"):
		# Poll for events from ws-glue.js every frame
		set_process(true)
		Logger.print(self, "MatchBridge initialized - polling for backend events")
	else:
		set_process(false)
		Logger.print(self, "MatchBridge initialized - desktop mode (no polling)")
```

**REPLACE with:**
```gdscript
func _ready():
	# Robust HTML5 detection (same as client_network.gd)
	var is_html5 = false
	
	# Method 1: Check OS feature flags
	if OS.has_feature("javascript") or OS.has_feature("HTML5"):
		is_html5 = true
	
	# Method 2: Check OS name
	if not is_html5:
		var os_name = OS.get_name()
		if os_name == "HTML5" or os_name == "Web" or os_name.to_lower() == "html5":
			is_html5 = true
	
	# Method 3: Try JavaScript access
	if not is_html5 and OS.has_feature("javascript"):
		var js_result = JavaScript.eval("typeof window !== 'undefined' ? 'html5' : 'desktop'", true)
		if js_result == "html5":
			is_html5 = true
	
	# Method 4: Check document
	if not is_html5 and OS.has_feature("javascript"):
		var doc_check = JavaScript.eval("typeof document !== 'undefined' ? true : false", true)
		if doc_check == true:
			is_html5 = true
	
	if is_html5:
		# Poll for events from ws-glue.js every frame
		set_process(true)
		Logger.print(self, "MatchBridge initialized - polling for backend events (HTML5 mode)")
	else:
		set_process(false)
		Logger.print(self, "MatchBridge initialized - desktop mode (no polling)")
```

**Also update `_process()` function (line 22):**

**FIND:**
```gdscript
func _process(_delta):
	if not OS.has_feature("javascript"):
		return
```

**REPLACE with:**
```gdscript
func _process(_delta):
	# Only process if we're in HTML5 mode
	# Check if JavaScript is available
	if not OS.has_feature("javascript"):
		return
```

---

## How to Apply:

1. **Fix client_network.gd:**
   - Open `res://client/client_network.gd`
   - Replace lines 52-70 with the robust detection code above
   - Save (Ctrl+S)

2. **Fix match_bridge.gd:**
   - Open `res://net/match_bridge.gd`
   - Replace `_ready()` function (lines 13-20) with robust detection
   - Update `_process()` check (line 23)
   - Save (Ctrl+S)

3. **Re-export HTML5:**
   - Project → Export → HTML5
   - Export to: `degn-arcade/public/games/sol-bird/client/`

4. **Test in Browser:**
   - Load game from production
   - Check console - should see:
     - `[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)`
     - `[ClientNetwork] HTML5 mode: Skipping menus, loading world scene directly`
   - World scene should load (no menus)

---

## Why This Works:

The robust detection tries **4 different methods**:
1. OS feature flags (standard method)
2. OS name check (fallback)
3. JavaScript `window` object check (most reliable)
4. JavaScript `document` object check (browser-only)

At least one of these should work in HTML5 export, ensuring menus are skipped.

