# 🚨 CRITICAL FIX: HTML5 Detection Not Working

## Problem
Even in HTML5 export, `OS.has_feature("javascript")` returns `false`, so menus are showing instead of skipping to world scene.

## Solution: Use Multiple Detection Methods

**Open file:** `res://client/client_network.gd` in Godot Editor

**Scroll to line 52** (the HTML5 check)

**FIND this code:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	if OS.has_feature("javascript"):
```

**REPLACE with this more robust detection:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	# Check multiple ways to detect HTML5 export
	var is_html5 = OS.has_feature("javascript") or OS.has_feature("HTML5") or OS.get_name() == "HTML5"
	
	# Also check if we can access JavaScript (more reliable)
	if not is_html5 and OS.has_feature("javascript"):
		# Try to detect via JavaScript availability
		var test_js = JavaScript.eval("typeof window !== 'undefined'", true)
		if test_js == true:
			is_html5 = true
	
	if is_html5:
```

**The full block should look like:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	# Check multiple ways to detect HTML5 export
	var is_html5 = OS.has_feature("javascript") or OS.has_feature("HTML5") or OS.get_name() == "HTML5"
	
	# Also check if we can access JavaScript (more reliable)
	if not is_html5:
		# Try to detect via JavaScript availability
		if OS.has_feature("javascript"):
			var test_js = JavaScript.eval("typeof window !== 'undefined'", true)
			if test_js == true:
				is_html5 = true
	
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

## Alternative: Force HTML5 Mode (If Above Doesn't Work)

If the detection still doesn't work, we can force HTML5 mode by checking the URL:

**REPLACE the detection with:**
```gdscript
	# NEW: In HTML5 mode, skip menus and use backend integration
	# Force HTML5 detection - if we can access window, we're in browser
	var is_html5 = false
	if OS.has_feature("javascript"):
		# Try to detect via JavaScript
		var js_check = JavaScript.eval("typeof window !== 'undefined' ? true : false", true)
		if js_check == true:
			is_html5 = true
		# Also check OS name as fallback
		if not is_html5:
			var os_name = OS.get_name()
			if os_name == "HTML5" or os_name == "Web":
				is_html5 = true
	
	# If still not detected, check if we're running from a web URL
	if not is_html5 and OS.has_feature("javascript"):
		# Last resort: try to get current URL
		var current_url = JavaScript.eval("window.location.href || ''", true)
		if current_url != null and current_url != "":
			is_html5 = true
			Logger.print(self, "Detected HTML5 via URL check: %s" % current_url)
	
	if is_html5:
```

## How to Fix:

1. Open Godot Editor
2. Open `res://client/client_network.gd`
3. Find line 52-53
4. Replace the `if OS.has_feature("javascript"):` check with the robust version above
5. **Save** (Ctrl+S)
6. **Re-export HTML5**
7. **Test in browser**

## Verify:

After fixing and exporting, in browser console you should see:
- `[ClientNetwork] HTML5 mode: Skipping menus, loading world scene directly` ← Should see this
- `[MatchBridge] MatchBridge initialized - polling for backend events` ← Should say "polling", not "desktop mode"

