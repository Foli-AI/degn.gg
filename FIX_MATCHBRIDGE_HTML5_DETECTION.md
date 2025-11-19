# 🚨 CRITICAL FIX: MatchBridge Not Detecting HTML5 Mode

## Problem
Console shows:
```
[MatchBridge] MatchBridge initialized - desktop mode (no polling)
```

This means MatchBridge is NOT polling for events from ws-glue.js, so GAME_START events are never received!

## Root Cause
`OS.has_feature("javascript")` returns `false` in HTML5 export, so MatchBridge thinks it's in desktop mode.

## Solution: Use Robust HTML5 Detection

### FIX: Update match_bridge.gd

**Open file:** `res://autoload/match_bridge.gd` in Godot Editor

**FIND the `_ready()` function (around line 13):**
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

### Also Update `_process()` Function

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
    # Only poll in HTML5 mode (set_process is false in desktop mode)
    if not OS.has_feature("javascript"):
        return
    
    # Poll window.latestMatchEvent from JavaScript
    # IMPORTANT: Clear the event after reading so we can detect new events
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

### Also Update `_handle_event()` Function

**FIND the `_handle_event()` function (around line 39):**
```gdscript
func _handle_event(evt):
    if not evt or typeof(evt) != TYPE_DICTIONARY:
        return
    
    var event_type = evt.get("type", "").to_upper()
    
    Logger.print(self, "Received event from backend: %s" % event_type)
    
    match event_type:
        "GAME_START":
            emit_signal("game_start", evt)
        "PLAYER_UPDATE":
            emit_signal("player_update", evt)
        "GAME_END":
            emit_signal("game_end", evt)
        _:
            Logger.print(self, "Unknown event type: %s" % event_type)
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

## After Fixing:

1. **Save the file** (Ctrl+S)
2. **Re-export HTML5** from Godot
3. **Test in browser** - Check console for:
   - `[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)` ✅
   - `[MatchBridge] ✅ ws-glue.js loaded: ...` ✅
   - `[MatchBridge] ✅ Received event from backend: GAME_START` ✅ (when backend sends it)

---

## Expected Console Output (After Fix):

```
[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)
[MatchBridge] ✅ ws-glue.js loaded: wsUrl=wss://degn-gg-1.onrender.com/ws, matchKey=lobby_..., playerId=player_...
[World] World ready!
[World] ✅ Connected to MatchBridge signals
[MatchBridge] ✅ Received event from backend: GAME_START
[MatchBridge] 🎮 Emitting game_start signal
[World] Received GAME_START payload: {...}
```

**The game should start!**

