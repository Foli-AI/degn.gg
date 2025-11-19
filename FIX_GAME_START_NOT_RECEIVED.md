# 🚨 FIX: Game Stuck on Blue Sky - GAME_START Not Received

## Problem
Game loads (world scene ready) but stays on blue sky screen. This means:
- ✅ World loaded
- ✅ RPC errors fixed
- ❌ GAME_START event not being received/processed

## Root Causes

1. **MatchBridge not clearing events** - Once it processes an event, it doesn't clear `window.latestMatchEvent`, so it won't detect new events
2. **ws-glue.js may not be connecting** - Need to verify WebSocket connection
3. **Backend may not be sending GAME_START** - Need to check if backend sends event after player connects

## Solution: Fix MatchBridge Event Polling

### FIX 1: Update MatchBridge to Clear Events After Processing

**Open file:** `res://autoload/match_bridge.gd` in Godot Editor

**FIND the `_process()` function (around line 22):**
```gdscript
func _process(_delta):
    if not OS.has_feature("javascript"):
        return
    
    # Poll window.latestMatchEvent from JavaScript
    var js_code = """
        (function() {
            return window.latestMatchEvent || null;
        })();
    """
    
    var event = JavaScript.eval(js_code, true)
    
    if event != null and event != latest_event:
        latest_event = event
        _handle_event(event)
```

**REPLACE with:**
```gdscript
func _process(_delta):
    if not OS.has_feature("javascript"):
        return
    
    # Poll window.latestMatchEvent from JavaScript
    var js_code = """
        (function() {
            var evt = window.latestMatchEvent;
            if (evt) {
                // Clear the event after reading it so we can detect new events
                window.latestMatchEvent = null;
            }
            return evt || null;
        })();
    """
    
    var event = JavaScript.eval(js_code, true)
    
    if event != null:
        # Always process new events (even if same type, payload might differ)
        latest_event = event
        _handle_event(event)
```

---

### FIX 2: Add Better Logging to MatchBridge

**In the same file, update `_handle_event()` function:**

**FIND:**
```gdscript
func _handle_event(evt):
    if not evt or typeof(evt) != TYPE_DICTIONARY:
        return
    
    var event_type = evt.get("type", "").to_upper()
    
    Logger.print(self, "Received event from backend: %s" % event_type)
```

**REPLACE with:**
```gdscript
func _handle_event(evt):
    if not evt:
        Logger.print(self, "⚠️ Received null event")
        return
    
    if typeof(evt) != TYPE_DICTIONARY:
        Logger.print(self, "⚠️ Event is not a dictionary: %s" % typeof(evt))
        return
    
    var event_type = evt.get("type", "").to_upper()
    var payload = evt.get("payload", evt)
    
    Logger.print(self, "✅ Received event from backend: %s" % event_type)
    Logger.print(self, "   Event payload: %s" % payload)
    
    match event_type:
        "GAME_START":
            Logger.print(self, "🎮 Emitting game_start signal")
            emit_signal("game_start", evt)
        "PLAYER_UPDATE":
            Logger.print(self, "👤 Emitting player_update signal")
            emit_signal("player_update", evt)
        "GAME_END":
            Logger.print(self, "🏁 Emitting game_end signal")
            emit_signal("game_end", evt)
        _:
            Logger.print(self, "⚠️ Unknown event type: %s (full event: %s)" % [event_type, evt])
```

---

### FIX 3: Add Debug Function to Check ws-glue.js Connection

**Add this to MatchBridge `_ready()` function:**

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
    if OS.has_feature("javascript"):
        # Poll for events from ws-glue.js every frame
        set_process(true)
        Logger.print(self, "MatchBridge initialized - polling for backend events (HTML5 mode)")
        
        # Check if ws-glue.js is loaded
        var check_glue = """
            (function() {
                return {
                    loaded: typeof window.__solBirdWsGlue !== 'undefined',
                    wsUrl: window.__solBirdWsGlue?.wsUrl || 'not set',
                    matchKey: window.__solBirdWsGlue?.matchKey || 'not set',
                    playerId: window.__solBirdWsGlue?.playerId || 'not set'
                };
            })();
        """
        var glue_info = JavaScript.eval(check_glue, true)
        if glue_info and glue_info.loaded:
            Logger.print(self, "✅ ws-glue.js loaded: wsUrl=%s, matchKey=%s, playerId=%s" % [glue_info.wsUrl, glue_info.matchKey, glue_info.playerId])
        else:
            Logger.print(self, "⚠️ ws-glue.js not loaded! Check if script is injected in index.html")
    else:
        set_process(false)
        Logger.print(self, "MatchBridge initialized - desktop mode (no polling)")
```

---

### FIX 4: Verify World is Listening to MatchBridge Signals

**Open file:** `res://common/world/world.gd` in Godot Editor

**Check that `_ready()` function has this (around line 44-57):**
```gdscript
func _ready() -> void:
	chunk_tracker.connect("load_chunk", level_generator, "spawn_obstacle")
	chunk_tracker.connect("unload_chunk", level_generator, "despawn_obstacle")
	Logger.print(self, "World ready!")

	# Hook into match_bridge signals (if autoload match_bridge exists)
	if bridge:
		# match_bridge will emit signals: game_start(evt), player_update(evt), game_end(evt)
		# evt is expected to be a Dictionary { "type": "...", "payload": {...} }
		bridge.connect("game_start", self, "_on_match_game_start")
		bridge.connect("player_update", self, "_on_match_player_update")
		bridge.connect("game_end", self, "_on_match_game_end")
		Logger.print(self, "✅ Connected to MatchBridge signals")
	else:
		Logger.print(self, "❌ MatchBridge not found. Multiplayer glue disabled.")
```

**If it's missing the `Logger.print` after connecting, add it!**

---

## Testing Steps

After applying fixes:

1. **Re-export HTML5** from Godot
2. **Open browser console** and look for:
   - `[MatchBridge] ✅ ws-glue.js loaded: ...` - Should show connection info
   - `[MatchBridge] ✅ Received event from backend: GAME_START` - Should appear when backend sends event
   - `[World] ✅ Connected to MatchBridge signals` - Should appear when world loads
   - `[World] Received GAME_START payload: ...` - Should appear when game starts

3. **If you see "ws-glue.js not loaded"**:
   - Check that `ws-glue.js` is injected in `index.html`
   - Check browser console for WebSocket connection errors

4. **If you see "Received event" but game doesn't start**:
   - Check `_on_match_game_start` function in `world.gd`
   - Look for errors in console

---

## Expected Console Output (After Fix):

```
[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)
[MatchBridge] ✅ ws-glue.js loaded: wsUrl=wss://..., matchKey=..., playerId=...
[World] World ready!
[World] ✅ Connected to MatchBridge signals
[MatchBridge] ✅ Received event from backend: GAME_START
[MatchBridge] 🎮 Emitting game_start signal
[World] Received GAME_START payload: {...}
[World] Starting game with seed = ...
```

