# 🚨 FIX: RPC Errors in HTML5 Mode

## Problem
Game is trying to call old multiplayer RPC functions (`rpc_id`) in HTML5 mode, but there's no network peer. Error: `Trying to call an RPC while no network peer is active.`

## Root Cause
In HTML5 mode, we use MatchBridge (ws-glue.js) instead of Godot's multiplayer RPC system. The code is still trying to use old RPC calls.

## Solution: Skip RPC Calls in HTML5 Mode

### FIX 1: Update send_client_ready() to Skip RPC in HTML5

**Open file:** `res://client/client_network.gd` in Godot Editor

**Scroll to line 416** (the `send_client_ready()` function)

**FIND:**
```gdscript
func send_client_ready() -> void:
	Logger.print(self, "Sending client ready")
	rpc_id(SERVER_ID, "receive_client_ready")
```

**REPLACE with:**
```gdscript
func send_client_ready() -> void:
	# In HTML5 mode, we don't use old multiplayer RPC - use MatchBridge instead
	var is_html5 = false
	if OS.has_feature("javascript") or OS.has_feature("HTML5"):
		is_html5 = true
	if not is_html5:
		var os_name = OS.get_name()
		if os_name == "HTML5" or os_name == "Web":
			is_html5 = true
	
	if is_html5:
		# HTML5 mode: Don't send RPC, MatchBridge will handle communication
		Logger.print(self, "Client ready (HTML5 mode - using MatchBridge)")
		return
	
	# Desktop mode: Use old multiplayer RPC
	Logger.print(self, "Sending client ready")
	if is_server_connected():
		rpc_id(SERVER_ID, "receive_client_ready")
	else:
		Logger.print(self, "Cannot send client ready - not connected to server")
```

---

### FIX 2: Update world.gd to Skip send_client_ready in HTML5

**Open file:** `res://client/world/world.gd` in Godot Editor

**Scroll to line 28** (in `_ready()` function)

**FIND:**
```gdscript
func _ready() -> void:
	Globals.client_world = self
	Network.Client.send_client_ready()
	$MainCamera.position = camera_starting_position
```

**REPLACE with:**
```gdscript
func _ready() -> void:
	Globals.client_world = self
	
	# Only send client_ready in desktop mode (not HTML5)
	var is_html5 = false
	if OS.has_feature("javascript") or OS.has_feature("HTML5"):
		is_html5 = true
	if not is_html5:
		var os_name = OS.get_name()
		if os_name == "HTML5" or os_name == "Web":
			is_html5 = true
	
	if not is_html5:
		Network.Client.send_client_ready()
	else:
		Logger.print(self, "HTML5 mode: Skipping send_client_ready (using MatchBridge)")
	
	$MainCamera.position = camera_starting_position
	$MainCamera.velocity = Vector2.ZERO
	last_spawn_x = $MainCamera.position.x + spawn_distance_ahead
```

**Also fix line 178** (in `start_game()` function):

**FIND:**
```gdscript
	$UI.set_player_list(new_player_list)
	$UI.update_lives(game_options.lives)
	Network.Client.send_client_ready()
	$UI/Loading.set_hint_text("Waiting for players")
```

**REPLACE with:**
```gdscript
	$UI.set_player_list(new_player_list)
	$UI.update_lives(game_options.lives)
	
	# Only send client_ready in desktop mode (not HTML5)
	var is_html5 = false
	if OS.has_feature("javascript") or OS.has_feature("HTML5"):
		is_html5 = true
	if not is_html5:
		var os_name = OS.get_name()
		if os_name == "HTML5" or os_name == "Web":
			is_html5 = true
	
	if not is_html5:
		Network.Client.send_client_ready()
	else:
		Logger.print(self, "HTML5 mode: Skipping send_client_ready in start_game")
	
	$UI/Loading.set_hint_text("Waiting for players")
```

---

### FIX 3: Check All RPC Calls in HTML5 Mode

We need to find and fix ALL RPC calls. Let me check what other functions use RPC:

**Search for these patterns in `client_network.gd`:**
- `rpc_id(` - All of these need HTML5 checks
- `rpc_unreliable_id(` - All of these need HTML5 checks

**Quick fix:** Wrap all RPC calls with HTML5 check. But for now, the critical one is `send_client_ready()`.

---

## How to Apply:

1. **Fix `send_client_ready()` in client_network.gd:**
   - Open `res://client/client_network.gd`
   - Replace function at line 416 with the HTML5-safe version above
   - Save (Ctrl+S)

2. **Fix `world.gd` _ready() function:**
   - Open `res://client/world/world.gd`
   - Replace line 28-31 with the HTML5-safe version above
   - Save (Ctrl+S)

3. **Fix `world.gd` start_game() function:**
   - In same file, replace lines 177-179 with the HTML5-safe version above
   - Save (Ctrl+S)

4. **Re-export HTML5:**
   - Project → Export → HTML5
   - Export to: `degn-arcade/public/games/sol-bird/client/`

5. **Test in Browser:**
   - Should NOT see RPC errors
   - World should load and wait for GAME_START from MatchBridge

---

## Expected Console Output (After Fix):

```
[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)
[ClientNetwork] HTML5 mode: Skipping menus, loading world scene directly
[ClientNetwork] Client ready (HTML5 mode - using MatchBridge)  ← Should see this
[World] HTML5 mode: Skipping send_client_ready (using MatchBridge)  ← Should see this
[World] World ready!
```

**No more RPC errors!**

