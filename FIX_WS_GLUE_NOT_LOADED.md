# 🚨 FIX: ws-glue.js Not Loading

## Problem
Console shows:
```
[MatchBridge] ⚠️ ws-glue.js not loaded! Check if script is injected in index.html
```

But the script tag IS in index.html! The issue is timing - MatchBridge checks for ws-glue.js in `_ready()`, which might run before the script executes.

## Solution: Retry Checking for ws-glue.js

### FIX: Update match_bridge.gd to Retry Checking

**Open file:** `res://autoload/match_bridge.gd` in Godot Editor

**FIND the `_ready()` function:**

**REPLACE the ws-glue.js check with a delayed retry:**

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
        
        # Don't check ws-glue.js immediately - it might not be loaded yet
        # We'll check it in _process() and log when it becomes available
    else:
        set_process(false)
        Logger.print(self, "MatchBridge initialized - desktop mode (no polling)")
```

**Then UPDATE the `_process()` function to check for ws-glue.js:**

**FIND:**
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

**REPLACE with:**
```gdscript
var ws_glue_checked = false  # Add this at the top of the file with other variables

func _process(_delta):
    # Only poll in HTML5 mode (set_process is false in desktop mode)
    if not OS.has_feature("javascript"):
        return
    
    # Check for ws-glue.js on first frame (it might load after _ready())
    if not ws_glue_checked:
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
            ws_glue_checked = true
        else:
            # Only log warning once per second to avoid spam
            if not has_node("ws_check_timer"):
                var timer = Timer.new()
                timer.name = "ws_check_timer"
                timer.wait_time = 1.0
                timer.one_shot = false
                timer.autostart = true
                add_child(timer)
                timer.connect("timeout", self, "_check_ws_glue")
    
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

# Add this new function
func _check_ws_glue():
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
        ws_glue_checked = true
        # Remove the timer
        var timer = get_node_or_null("ws_check_timer")
        if timer:
            timer.queue_free()
    else:
        Logger.print(self, "⚠️ ws-glue.js still not loaded. Check browser console for script errors.")
```

---

## Alternative: Check Browser Console for Errors

If ws-glue.js still doesn't load, check the browser console for:
- **404 errors** - Script file not found (path issue)
- **JavaScript errors** - Script has a syntax error
- **CORS errors** - Script blocked by browser

**To debug:**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Reload the page
4. Look for `ws-glue.js` - is it loading? What's the status code?
5. Go to **Console** tab - are there any red errors?

---

## Expected Console Output (After Fix):

```
[MatchBridge] MatchBridge initialized - polling for backend events (HTML5 mode)
[MatchBridge] ✅ ws-glue.js loaded: wsUrl=wss://..., matchKey=..., playerId=...
[MatchBridge] ✅ Received event from backend: GAME_START
```

**If you still see "ws-glue.js not loaded" after 2-3 seconds, check:**
1. Browser console for script errors
2. Network tab to see if ws-glue.js is being fetched
3. That the file exists at `public/games/sol-bird/client/ws-glue.js`

