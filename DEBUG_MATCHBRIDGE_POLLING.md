# 🔍 DEBUG: MatchBridge Not Detecting Events

## Current Status
- ✅ ws-glue.js receives GAME_START
- ✅ window.latestMatchEvent is set
- ❌ MatchBridge doesn't log "Received event from backend: GAME_START"
- ❌ Game stays on blue sky

## Quick Debug: Add Temporary Logging

**Open file:** `res://net/match_bridge.gd` in Godot Editor

**FIND the `_process()` function and ADD this at the very start:**

```gdscript
func _process(_delta):
    # DEBUG: Log every frame to verify _process is running
    if OS.get_ticks_msec() % 1000 < 50:  # Log once per second
        Logger.print(self, "DEBUG: _process() is running (HTML5 mode)")
    
    # Only poll in HTML5 mode (set_process is false in desktop mode)
    if not OS.has_feature("javascript"):
        return
    
    # DEBUG: Try to read window.latestMatchEvent directly
    var debug_check = """
        (function() {
            return {
                hasEvent: window.latestMatchEvent !== null && window.latestMatchEvent !== undefined,
                eventType: window.latestMatchEvent?.type || 'null',
                eventPayload: window.latestMatchEvent?.payload || window.latestMatchEvent || 'null'
            };
        })();
    """
    var debug_info = JavaScript.eval(debug_check, true)
    if debug_info and debug_info.hasEvent:
        Logger.print(self, "DEBUG: window.latestMatchEvent exists! Type: %s" % debug_info.eventType)
    
    # ... rest of your _process() function
```

**This will help us see:**
1. Is `_process()` running?
2. Can MatchBridge read `window.latestMatchEvent`?
3. What's the event structure?

---

## Alternative: Manual Test in Browser Console

After the page loads, run this in the browser console:

```javascript
// Check if MatchBridge can access the event
console.log('window.latestMatchEvent:', window.latestMatchEvent);

// Try to manually trigger MatchBridge (if accessible)
if (window.__solBirdWsGlue) {
    console.log('ws-glue info:', window.__solBirdWsGlue);
}

// Check if event is still there
setInterval(() => {
    console.log('Latest event:', window.latestMatchEvent);
}, 2000);
```

---

## Most Likely Issue: File Not Updated

**Did you replace the entire `res://net/match_bridge.gd` file with the code from `FIX_MATCHBRIDGE_FINAL.md`?**

The old version doesn't have:
- Event clearing after reading
- Robust HTML5 detection
- Better logging

**To fix:**
1. Open `res://net/match_bridge.gd` in Godot
2. Select ALL (Ctrl+A)
3. Delete everything
4. Paste the ENTIRE code from `FIX_MATCHBRIDGE_FINAL.md`
5. Save (Ctrl+S)
6. Re-export HTML5
7. Test again

---

## Expected Console Output (After Fix):

```
[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)
[MatchBridge] ✅ ws-glue.js loaded: wsUrl=wss://..., matchKey=..., playerId=...
[ws-glue] ✅ Set window.latestMatchEvent: {type: "GAME_START", ...}
[MatchBridge] DEBUG: window.latestMatchEvent exists! Type: GAME_START
[MatchBridge] ✅ Received event from backend: GAME_START
[MatchBridge] 🎮 Emitting game_start signal
[World] Received GAME_START payload: {...}
```

