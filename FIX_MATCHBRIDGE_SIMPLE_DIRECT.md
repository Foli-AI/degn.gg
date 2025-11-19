# 🚨 SIMPLE DIRECT FIX: MatchBridge Not Reading Events

## Problem
- ✅ ws-glue.js sets `window.latestMatchEvent`
- ✅ MatchBridge initializes
- ❌ No debug output from MatchBridge
- ❌ Event never detected

## Most Likely Issue
The `_process()` function might not be running, or JavaScript.eval isn't working properly.

## Simple Direct Fix

**Open file:** `res://net/match_bridge.gd` in Godot Editor

**REPLACE THE ENTIRE FILE with this SIMPLIFIED version:**

```gdscript
# net/match_bridge.gd
# Bridge between Godot and backend WebSocket (ws-glue.js)

extends Node

signal game_start(evt)
signal player_update(evt)
signal game_end(evt)

var latest_event = null
var check_count = 0

func _ready():
    # Simple HTML5 check
    var is_html5 = OS.get_name() == "HTML5" or OS.has_feature("HTML5") or OS.has_feature("javascript")
    
    if is_html5:
        set_process(true)
        Logger.print(self, "MatchBridge initialized - HTML5 mode, polling enabled")
    else:
        set_process(false)
        Logger.print(self, "MatchBridge initialized - desktop mode")

func _process(_delta):
    check_count += 1
    
    # Log every 60 frames (once per second at 60 FPS) to verify it's running
    if check_count % 60 == 0:
        Logger.print(self, "DEBUG: _process() running, check #%d" % check_count)
    
    # Simple direct read - no clearing, just check
    var js_code = "window.latestMatchEvent || null;"
    var event = JavaScript.eval(js_code, true)
    
    if event != null:
        # Check if this is a new event
        var event_type = ""
        if typeof(event) == TYPE_DICTIONARY:
            event_type = event.get("type", "")
        
        # Only process if different from last event
        if event != latest_event:
            Logger.print(self, "DEBUG: New event detected! Type: %s" % event_type)
            Logger.print(self, "DEBUG: Event structure: %s" % typeof(event))
            
            latest_event = event
            
            # Now clear it so we can detect the next one
            JavaScript.eval("window.latestMatchEvent = null;", true)
            
            # Process the event
            _handle_event(event)
    elif check_count % 60 == 0:
        Logger.print(self, "DEBUG: No event in window.latestMatchEvent")

func _handle_event(evt):
    Logger.print(self, "DEBUG: _handle_event() called")
    
    if not evt:
        Logger.print(self, "ERROR: _handle_event received null")
        return
    
    if typeof(evt) != TYPE_DICTIONARY:
        Logger.print(self, "ERROR: Event is not dictionary, type: %s, value: %s" % [typeof(evt), evt])
        return
    
    var event_type = evt.get("type", "")
    Logger.print(self, "DEBUG: Raw event type: '%s'" % event_type)
    
    if not event_type:
        Logger.print(self, "ERROR: Event has no 'type' field. Keys: %s" % evt.keys())
        return
    
    event_type = event_type.to_upper()
    Logger.print(self, "DEBUG: Uppercase event type: '%s'" % event_type)
    
    Logger.print(self, "✅ Processing event: %s" % event_type)
    
    match event_type:
        "GAME_START":
            Logger.print(self, "🎮 GAME_START detected! Emitting signal...")
            emit_signal("game_start", evt)
            Logger.print(self, "✅ game_start signal emitted")
        "PLAYER_UPDATE":
            Logger.print(self, "👤 PLAYER_UPDATE detected! Emitting signal...")
            emit_signal("player_update", evt)
        "GAME_END":
            Logger.print(self, "🏁 GAME_END detected! Emitting signal...")
            emit_signal("game_end", evt)
        _:
            Logger.print(self, "⚠️ Unknown event type: '%s'. Full event: %s" % [event_type, evt])
```

---

## Key Changes:

1. **Simplified HTML5 detection** - Just check OS name and features
2. **Direct event reading** - No complex JavaScript, just `window.latestMatchEvent || null`
3. **Aggressive logging** - Logs every step so we can see what's happening
4. **Clear after processing** - Only clear after we've processed it
5. **Type checking** - Verify event is a dictionary before processing

---

## After Updating:

1. **Save the file** (Ctrl+S)
2. **Re-export HTML5**
3. **Test in browser**
4. **You should see:**
   ```
   [MatchBridge] MatchBridge initialized - HTML5 mode, polling enabled
   [MatchBridge] DEBUG: _process() running, check #60
   [MatchBridge] DEBUG: New event detected! Type: GAME_START
   [MatchBridge] 🎮 GAME_START detected! Emitting signal...
   ```

---

## If You Still Don't See Debug Output:

1. **Verify the file was saved** - Check the modification time
2. **Verify it's an autoload** - Project → Project Settings → Autoload tab
3. **Check for script errors** - Look for red errors in Godot editor
4. **Try running in Godot editor** - See if there are any parse errors

**Share the console output after this fix!**

