# Quick Fix Summary - What You Need to Do in Godot

## Critical Fixes (Do These First)

### 1. Fix `spawn_relative` Error ⚠️ CRITICAL

**Find:** `obstacle_spawner.gd` (or wherever obstacles are spawned)

**Search for:** `spawn_relative`

**Replace with:** Check what the actual function name is. It's probably:
- `spawn_obstacle(position)`
- `spawn_at_position(position)`
- Or similar

**Action:** Search your entire project for `spawn_relative` and replace with correct function.

---

### 2. Create MatchBridge Autoload ⚠️ REQUIRED

**Create file:** `autoload/match_bridge.gd`

**Copy this code:**
```gdscript
extends Node

signal game_start(evt)
signal player_update(evt)
signal game_end(evt)

var latest_event = null

func _ready():
    if OS.has_feature("javascript"):
        set_process(true)
    else:
        set_process(false)

func _process(_delta):
    if not OS.has_feature("javascript"):
        return
    
    var js_code = """
        (function() {
            return window.latestMatchEvent || null;
        })();
    """
    
    var event = JavaScript.eval(js_code, true)
    
    if event != null and event != latest_event:
        latest_event = event
        _handle_event(event)

func _handle_event(evt):
    if not evt or typeof(evt) != TYPE_DICTIONARY:
        return
    
    var event_type = evt.get("type", "").to_upper()
    
    match event_type:
        "GAME_START":
            emit_signal("game_start", evt)
        "PLAYER_UPDATE":
            emit_signal("player_update", evt)
        "GAME_END":
            emit_signal("game_end", evt)
```

**Then:**
1. Go to Project → Project Settings → Autoload
2. Add `match_bridge` with path `res://autoload/match_bridge.gd`

---

### 3. Add Results Screen to world.gd ⚠️ REQUIRED

**File:** `common/world/world.gd`

**Add this function:**
```gdscript
func show_results_screen(payload: Dictionary):
    if not OS.has_feature("javascript"):
        return
    
    var current_player_id = _get_current_player_id()
    var entry_fee = float(payload.get("entryFee", 0))
    
    var player_rank = null
    if payload.has("rankings"):
        for rank in payload.rankings:
            if str(rank.get("playerId", "")) == str(current_player_id):
                player_rank = rank
                break
    
    var position = player_rank.get("position", 999) if player_rank else 999
    var payout = float(player_rank.get("payout", 0)) if player_rank else 0.0
    
    var message = ""
    if payout > 0:
        message = "YOU WON! Position: %d, Payout: %.2f SOL" % [position, payout]
    else:
        message = "YOU LOST. Position: %d, Lost: %.2f SOL" % [position, entry_fee]
    
    JavaScript.eval("""
        alert('%s');
        setTimeout(function() {
            if (window.parent && window.parent.location) {
                window.parent.location.href = '/';
            } else {
                window.location.href = '/';
            }
        }, 3000);
    """ % message, true)

func _get_current_player_id() -> String:
    if OS.has_feature("javascript"):
        var js_code = """
            (function() {
                var params = new URLSearchParams(window.location.search);
                return params.get('playerId') || '';
            })();
        """
        var result = JavaScript.eval(js_code, true)
        return str(result) if result else ""
    return ""
```

**Update `_on_match_game_end()` to call it:**
```gdscript
func _on_match_game_end(evt: Dictionary) -> void:
    var payload = evt.get("payload", evt)
    Logger.print(self, "Received GAME_END payload: %s" % [payload])

    is_active = false
    
    if round_end_timer != null:
        round_end_timer.stop()
        round_end_timer.queue_free()
        round_end_timer = null

    for player in spawned_players:
        player.set_enable_movement(false)

    # NEW: Show results
    show_results_screen(payload)
    
    if payload.has("rankings"):
        show_backend_leaderboard(payload.rankings)
    
    end_race()
```

---

### 4. Prevent Old Multiplayer Connection

**File:** `client/client_network.gd`

**Find `start_client()` function and add this at the top:**
```gdscript
func start_client(host: String, port: int, singleplayer: bool = false) -> void:
    # In HTML5 mode, don't use old multiplayer - use match_bridge instead
    if OS.has_feature("javascript"):
        Logger.print(self, "HTML5 mode: Skipping old multiplayer connection. Using match_bridge.")
        return
    
    # ... rest of function
```

---

## After Fixes

1. **Export as HTML5** to `degn-arcade/public/games/sol-bird/client/`
2. **Test:**
   - Join game → Should go straight to game (no menus)
   - Play → Should work without errors
   - Finish → Should show win/loss popup
   - Should redirect back to lobby

---

## Files You Need to Edit

1. ✅ `client/client_network.gd` - Add start_client() check
2. ✅ `common/world/world.gd` - Add show_results_screen()
3. ❌ `obstacle_spawner.gd` - Fix spawn_relative error
4. ❌ Create `autoload/match_bridge.gd` - NEW FILE

That's it! These 4 changes should fix everything.

