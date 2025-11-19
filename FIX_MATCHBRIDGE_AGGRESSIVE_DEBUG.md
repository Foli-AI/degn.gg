# 🚨 AGGRESSIVE DEBUG: MatchBridge Not Detecting Events

## Problem
- ✅ ws-glue.js sets `window.latestMatchEvent`
- ✅ MatchBridge initializes in HTML5 mode
- ❌ MatchBridge never logs "Received event from backend: GAME_START"
- ❌ Game stays on blue sky

## Solution: Add Aggressive Debugging

**Open file:** `res://net/match_bridge.gd` in Godot Editor

**REPLACE the `_process()` function with this DEBUG version:**

```gdscript
func _process(_delta):
    # Only poll in HTML5 mode (set_process is false in desktop mode)
    if not OS.has_feature("javascript"):
        return
    
    # AGGRESSIVE DEBUG: Log every second to verify _process is running
    var frame_count = Engine.get_frames_drawn()
    if frame_count % 60 == 0:  # Log once per second (assuming 60 FPS)
        Logger.print(self, "DEBUG: _process() running, frame: %d" % frame_count)
    
    # DEBUG: Check if we can access JavaScript at all
    var js_test = JavaScript.eval("typeof window !== 'undefined' ? 'ok' : 'fail'", true)
    if frame_count % 60 == 0:
        Logger.print(self, "DEBUG: JavaScript access test: %s" % js_test)
    
    # DEBUG: Try to read window.latestMatchEvent with detailed logging
    var js_code = """
        (function() {
            var evt = window.latestMatchEvent;
            var result = {
                hasEvent: evt !== null && evt !== undefined,
                eventType: evt?.type || 'null',
                eventKeys: evt ? Object.keys(evt) : [],
                fullEvent: evt
            };
            // DON'T clear yet - we'll do that after logging
            return result;
        })();
    """
    
    var debug_result = JavaScript.eval(js_code, true)
    
    if frame_count % 60 == 0:  # Log once per second
        if debug_result:
            Logger.print(self, "DEBUG: window.latestMatchEvent check:")
            Logger.print(self, "  - hasEvent: %s" % debug_result.hasEvent)
            Logger.print(self, "  - eventType: %s" % debug_result.eventType)
            Logger.print(self, "  - eventKeys: %s" % debug_result.eventKeys)
    
    # Now actually read and clear the event
    var js_read_code = """
        (function() {
            var evt = window.latestMatchEvent;
            if (evt) {
                // Clear the event after reading it so we can detect new events
                window.latestMatchEvent = null;
            }
            return evt || null;
        })();
    """
    
    var event = JavaScript.eval(js_read_code, true)
    
    if event != null:
        Logger.print(self, "DEBUG: ✅ Found event! Type: %s" % event.get("type", "unknown"))
        Logger.print(self, "DEBUG: Event is dictionary: %s" % (typeof(event) == TYPE_DICTIONARY))
        Logger.print(self, "DEBUG: Latest event was: %s" % latest_event)
        Logger.print(self, "DEBUG: Events are different: %s" % (event != latest_event))
        
        # Always process new events (even if same type, payload might differ)
        latest_event = event
        _handle_event(event)
    elif frame_count % 60 == 0:
        Logger.print(self, "DEBUG: No event found in window.latestMatchEvent")
```

**Also update `_handle_event()` to add more logging:**

```gdscript
func _handle_event(evt):
    Logger.print(self, "DEBUG: _handle_event() called with: %s" % evt)
    Logger.print(self, "DEBUG: evt is null: %s" % (evt == null))
    Logger.print(self, "DEBUG: typeof evt: %s" % typeof(evt))
    
    if not evt:
        Logger.print(self, "⚠️ Received null event")
        return
    
    if typeof(evt) != TYPE_DICTIONARY:
        Logger.print(self, "⚠️ Event is not a dictionary: %s (value: %s)" % [typeof(evt), evt])
        return
    
    var event_type = evt.get("type", "")
    Logger.print(self, "DEBUG: Raw event_type: '%s'" % event_type)
    
    event_type = event_type.to_upper()
    Logger.print(self, "DEBUG: Uppercase event_type: '%s'" % event_type)
    
    var payload = evt.get("payload", evt)
    
    Logger.print(self, "✅ Received event from backend: %s" % event_type)
    Logger.print(self, "   Event payload: %s" % payload)
    
    match event_type:
        "GAME_START":
            Logger.print(self, "🎮 MATCH SUCCESS! Emitting game_start signal")
            emit_signal("game_start", evt)
        "PLAYER_UPDATE":
            Logger.print(self, "👤 Emitting player_update signal")
            emit_signal("player_update", evt)
        "GAME_END":
            Logger.print(self, "🏁 Emitting game_end signal")
            emit_signal("game_end", evt)
        _:
            Logger.print(self, "⚠️ Unknown event type: '%s' (full event: %s)" % [event_type, evt])
```

---

## After Adding Debug Code:

1. **Save the file** (Ctrl+S)
2. **Re-export HTML5**
3. **Test in browser**
4. **Check console** - You should now see:
   - `DEBUG: _process() running, frame: X` (every second)
   - `DEBUG: window.latestMatchEvent check:` (every second)
   - `DEBUG: ✅ Found event!` (when event is detected)

---

## What to Look For:

1. **If you see "DEBUG: _process() running"** → MatchBridge is polling ✅
2. **If you see "hasEvent: true" but no "Found event!"** → Event structure issue
3. **If you see "Found event!" but no "MATCH SUCCESS!"** → Event type mismatch
4. **If you see nothing** → `_process()` might not be running

**Share the console output after adding this debug code!**

