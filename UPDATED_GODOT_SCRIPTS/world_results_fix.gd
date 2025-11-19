# ADD THESE FUNCTIONS TO: common/world/world.gd
# Add them after the _on_match_game_end() function

# Show results screen with win/loss and redirect
func show_results_screen(payload: Dictionary):
    if not OS.has_feature("javascript"):
        Logger.print(self, "Not HTML5 mode, skipping results screen")
        return
    
    # Get current player's ID from query params
    var current_player_id = _get_current_player_id()
    var entry_fee = float(payload.get("entryFee", payload.get("entryAmount", 0)))
    
    Logger.print(self, "Showing results for player: %s, entry: %f" % [current_player_id, entry_fee])
    
    # Find player in rankings
    var player_rank = null
    if payload.has("rankings"):
        for rank in payload.rankings:
            var rank_player_id = str(rank.get("playerId", ""))
            if rank_player_id == current_player_id:
                player_rank = rank
                break
    
    var position = player_rank.get("position", 999) if player_rank else 999
    var payout = float(player_rank.get("payout", 0)) if player_rank else 0.0
    
    Logger.print(self, "Player position: %d, payout: %f" % [position, payout])
    
    # Build message
    var message = ""
    if payout > 0:
        message = "YOU WON! 🎉\\n\\nPosition: %d\\nPayout: %.2f SOL\\n\\nRedirecting to lobby..." % [position, payout]
    else:
        message = "YOU LOST\\n\\nPosition: %d\\nLost: %.2f SOL\\n\\nRedirecting to lobby..." % [position, entry_fee]
    
    # Show alert and redirect
    JavaScript.eval("""
        (function() {
            alert('%s');
            setTimeout(function() {
                // Try to redirect parent window (if in iframe)
                if (window.parent && window.parent.location && window.parent.location.href !== window.location.href) {
                    window.parent.location.href = '/';
                } else {
                    // Fallback: redirect current window
                    window.location.href = '/';
                }
            }, 3000);
        })();
    """ % message, true)

# Get current player ID from URL query params
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

