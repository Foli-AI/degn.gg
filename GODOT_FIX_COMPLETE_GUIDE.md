# Complete Godot Fix Guide - Sol Bird Integration

## Issues to Fix

1. ❌ Game shows main menu instead of going straight into game
2. ❌ No win/loss popup after game ends
3. ❌ No redirect back to degn.gg lobby
4. ❌ `spawn_relative` function error in obstacle_spawner.gd
5. ❌ Game trying to connect to old multiplayer server

---

## Step 1: Fix `spawn_relative` Error

**File:** `common/world/obstacle_spawner.gd` (or wherever obstacle spawning happens)

**Problem:** The code is calling `spawn_relative()` which doesn't exist.

**Fix:** Find where `spawn_relative` is called and replace it with the correct function. Check your obstacle_spawner script - it should use `spawn_obstacle()` or similar.

**Example fix:**
```gdscript
# WRONG:
spawn_relative(position)

# CORRECT (check your actual function name):
spawn_obstacle(position)
# OR
spawn_at_position(position)
```

**Action:** Search your Godot project for `spawn_relative` and replace with the correct function name.

---

## Step 2: Ensure Menu Skip Works

**File:** `client/client_network.gd`

**Current code (lines 52-67):**
```gdscript
# NEW: In HTML5 mode, skip menus and use backend integration
if OS.has_feature("javascript"):
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
    change_scene_to_title_screen(false)
```

**Verify:**
1. This code is in your `client_network.gd`
2. The `world_scene` path is correct: `"res://client/world/world.tscn"`
3. Make sure `change_scene()` function exists and works

**If menus still show:**
- Check if `OS.has_feature("javascript")` returns true in HTML5 export
- Add debug print: `print("HTML5 mode: ", OS.has_feature("javascript"))`
- Make sure you're exporting as HTML5, not desktop

---

## Step 3: Disable Old Multiplayer Connection

**File:** `client/client_network.gd`

**Problem:** The game is trying to connect to the old WebSocket server.

**Fix:** Make sure `start_client()` is NEVER called in HTML5 mode.

**Add this check:**
```gdscript
func start_client(host: String, port: int, singleplayer: bool = false) -> void:
    # In HTML5 mode, don't use old multiplayer - use match_bridge instead
    if OS.has_feature("javascript"):
        Logger.print(self, "HTML5 mode: Skipping old multiplayer connection. Using match_bridge.")
        return
    
    # Only use old multiplayer in desktop mode
    is_singleplayer = singleplayer
    # ... rest of function
```

**Also check:**
- Make sure no code calls `start_client()` when in HTML5 mode
- The `lost_connection()` function should NOT go back to title screen in HTML5 mode (already fixed in your code)

---

## Step 4: Create MatchBridge Autoload

**File:** Create new file: `autoload/match_bridge.gd`

**Purpose:** Bridge between Godot and the backend WebSocket (ws-glue.js)

```gdscript
# autoload/match_bridge.gd
extends Node

signal game_start(evt)
signal player_update(evt)
signal game_end(evt)

var latest_event = null

func _ready():
    if OS.has_feature("javascript"):
        # Poll for events from ws-glue.js every frame
        set_process(true)
    else:
        set_process(false)

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
        _:
            Logger.print(self, "Unknown event type: %s" % event_type)
```

**Action:**
1. Create this file in your Godot project
2. Go to Project → Project Settings → Autoload
3. Add `match_bridge` as an autoload with path `res://autoload/match_bridge.gd`

---

## Step 5: Add Results Screen & Redirect

**File:** Create new file: `client/world/results_screen.gd` (or add to existing UI)

**Purpose:** Show win/loss popup and redirect back to degn.gg

```gdscript
# client/world/results_screen.gd
extends Control

var player_position: int = 0
var player_payout: float = 0.0
var entry_fee: float = 0.0
var is_winner: bool = false

func show_results(position: int, payout: float, entry: float):
    player_position = position
    player_payout = payout
    entry_fee = entry
    is_winner = payout > 0
    
    # Show the results UI
    visible = true
    update_display()
    
    # Auto-redirect after 5 seconds
    yield(get_tree().create_timer(5.0), "timeout")
    redirect_to_lobby()

func update_display():
    # Update UI labels with position, payout, etc.
    # You'll need to connect this to your UI nodes
    var result_label = $ResultLabel
    var payout_label = $PayoutLabel
    
    if is_winner:
        result_label.text = "YOU WON! 🎉"
        payout_label.text = "+%.2f SOL" % player_payout
    else:
        result_label.text = "YOU LOST"
        payout_label.text = "-%.2f SOL" % entry_fee

func redirect_to_lobby():
    if OS.has_feature("javascript"):
        JavaScript.eval("""
            window.parent.postMessage({
                type: 'GAME_END',
                redirect: true
            }, '*');
            
            // Fallback: direct redirect
            if (window.parent && window.parent.location) {
                window.parent.location.href = '/';
            } else {
                window.location.href = '/';
            }
        """, true)
    else:
        # Desktop mode: just close or show message
        get_tree().quit()

func _on_continue_button_pressed():
    redirect_to_lobby()
```

**Action:**
1. Create this script
2. Create a UI scene with:
   - ResultLabel (shows "YOU WON!" or "YOU LOST")
   - PayoutLabel (shows SOL amount)
   - ContinueButton
3. Attach the script to the scene
4. Connect the button to `_on_continue_button_pressed()`

---

## Step 6: Update world_common.gd to Show Results

**File:** `common/world/world.gd`

**Add this to `_on_match_game_end()` function:**

```gdscript
func _on_match_game_end(evt: Dictionary) -> void:
    var payload = evt.get("payload", evt)
    Logger.print(self, "Received GAME_END payload: %s" % [payload])

    # Stop the round
    is_active = false
    
    # Stop round timer if still running
    if round_end_timer != null:
        round_end_timer.stop()
        round_end_timer.queue_free()
        round_end_timer = null

    # Stop all players
    for player in spawned_players:
        player.set_enable_movement(false)

    # NEW: Show results screen
    show_results_screen(payload)
    
    # Show leaderboard from backend rankings
    if payload.has("rankings"):
        show_backend_leaderboard(payload.rankings)
    
    end_race()

# NEW: Show results screen with win/loss
func show_results_screen(payload: Dictionary):
    if not OS.has_feature("javascript"):
        return
    
    # Get current player's ID (from query params or Globals)
    var current_player_id = _get_current_player_id()
    var entry_fee = float(payload.get("entryFee", 0))
    
    # Find player in rankings
    var player_rank = null
    if payload.has("rankings"):
        for rank in payload.rankings:
            if str(rank.get("playerId", "")) == str(current_player_id):
                player_rank = rank
                break
    
    var position = player_rank.get("position", 999) if player_rank else 999
    var payout = float(player_rank.get("payout", 0)) if player_rank else 0.0
    
    # Show results UI
    var results_ui = get_node_or_null("UI/ResultsScreen")
    if results_ui:
        results_ui.show_results(position, payout, entry_fee)
    else:
        # Fallback: use JavaScript alert and redirect
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

---

## Step 7: Update Next.js Page to Handle Redirect

**File:** `degn-arcade/src/app/play/sol-bird/page.tsx`

**Add message listener for game end:**

```tsx
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'GAME_END' && event.data?.redirect) {
      // Redirect back to lobby
      window.location.href = '/';
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

---

## Step 8: Fix obstacle_spawner.gd

**File:** Find `obstacle_spawner.gd` in your project

**Search for:** `spawn_relative`

**Replace with:** The correct function name (likely `spawn_obstacle` or `spawn_at_position`)

**If you can't find the function:**
1. Check what functions exist in the obstacle_spawner script
2. Look at how obstacles are spawned elsewhere in the code
3. The function should take a position Vector2 as parameter

---

## Summary of Files to Edit in Godot

1. ✅ `client/client_network.gd` - Already updated (skip menus)
2. ✅ `common/world/world.gd` - Already updated (match events)
3. ❌ `common/world/obstacle_spawner.gd` - **FIX `spawn_relative` error**
4. ❌ Create `autoload/match_bridge.gd` - **NEW FILE**
5. ❌ Create `client/world/results_screen.gd` - **NEW FILE/SCENE**
6. ❌ Update `common/world/world.gd` - **ADD `show_results_screen()` function**

---

## After Making Changes

1. **Test in Godot Editor first** (desktop mode should still work)
2. **Export as HTML5** to `degn-arcade/public/games/sol-bird/client/`
3. **Test the flow:**
   - Join game from lobby
   - Should go straight to game (no menus)
   - Play game
   - Finish game
   - Should see results popup
   - Should redirect back to lobby

---

## Quick Checklist

- [ ] Fix `spawn_relative` error in obstacle_spawner
- [ ] Verify menu skip works (check client_network.gd)
- [ ] Create match_bridge autoload
- [ ] Create results screen UI and script
- [ ] Add show_results_screen() to world.gd
- [ ] Update Next.js page to handle redirect
- [ ] Export HTML5 and test

---

## Need Help?

If you're stuck on any step, let me know which file you're editing and what error you're getting. The most critical fixes are:
1. Fixing the `spawn_relative` error
2. Creating the match_bridge autoload
3. Adding the results screen

