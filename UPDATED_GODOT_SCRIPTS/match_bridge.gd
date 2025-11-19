# autoload/match_bridge.gd
# Bridge between Godot and backend WebSocket (ws-glue.js)
# Add this as an autoload in Project Settings

extends Node

signal game_start(evt)
signal player_update(evt)
signal game_end(evt)

var latest_event = null

func _ready():
    if OS.has_feature("javascript"):
        # Poll for events from ws-glue.js every frame
        set_process(true)
        Logger.print(self, "MatchBridge initialized - polling for backend events")
    else:
        set_process(false)
        Logger.print(self, "MatchBridge initialized - desktop mode (no polling)")

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

