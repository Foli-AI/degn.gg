# 🚨 QUICK FIX: RPC Errors in HTML5 Mode

## Problem
`ERROR: Trying to call an RPC while no network peer is active.` - Game is calling old multiplayer RPC in HTML5 mode.

## Quick Fix: Add HTML5 Check to send_client_ready()

### Step 1: Fix send_client_ready() Function

**Open file:** `res://client/client_network.gd` in Godot Editor

**Scroll to line 416**

**FIND:**
```gdscript
func send_client_ready() -> void:
	Logger.print(self, "Sending client ready")
	rpc_id(SERVER_ID, "receive_client_ready")
```

**REPLACE with:**
```gdscript
func send_client_ready() -> void:
	# Check if we're in HTML5 mode (using MatchBridge, not old multiplayer)
	var is_html5 = OS.has_feature("javascript") or OS.has_feature("HTML5") or OS.get_name() == "HTML5" or OS.get_name() == "Web"
	
	if is_html5:
		# HTML5 mode: Don't use RPC, MatchBridge handles communication
		Logger.print(self, "Client ready (HTML5 mode - skipping RPC)")
		return
	
	# Desktop mode: Use old multiplayer RPC
	Logger.print(self, "Sending client ready")
	if is_server_connected():
		rpc_id(SERVER_ID, "receive_client_ready")
	else:
		Logger.print(self, "Cannot send client ready - not connected")
```

---

### Step 2: Fix world.gd _ready() Function

**Open file:** `res://client/world/world.gd` in Godot Editor

**Scroll to line 28**

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
	
	# Only send client_ready in desktop mode (HTML5 uses MatchBridge)
	var is_html5 = OS.has_feature("javascript") or OS.has_feature("HTML5") or OS.get_name() == "HTML5" or OS.get_name() == "Web"
	if not is_html5:
		Network.Client.send_client_ready()
	else:
		Logger.print(self, "HTML5 mode: Skipping send_client_ready (using MatchBridge)")
	
	$MainCamera.position = camera_starting_position
	$MainCamera.velocity = Vector2.ZERO
	last_spawn_x = $MainCamera.position.x + spawn_distance_ahead
```

---

### Step 3: Fix world.gd start_game() Function

**In the same file, scroll to line 178**

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
	
	# Only send client_ready in desktop mode (HTML5 uses MatchBridge)
	var is_html5 = OS.has_feature("javascript") or OS.has_feature("HTML5") or OS.get_name() == "HTML5" or OS.get_name() == "Web"
	if not is_html5:
		Network.Client.send_client_ready()
	
	$UI/Loading.set_hint_text("Waiting for players")
```

---

## After Fixing:

1. **Save both files** (Ctrl+S)
2. **Re-export HTML5**
3. **Test in browser** - RPC errors should be gone
4. **World should load** and wait for GAME_START from MatchBridge

---

## Expected Result:

- ✅ No RPC errors in console
- ✅ World scene loads (not stuck on sky)
- ✅ Game waits for GAME_START event from backend via MatchBridge
- ✅ When backend sends GAME_START, world should start the game

