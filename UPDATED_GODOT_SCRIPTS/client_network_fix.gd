# ADD THIS TO: client/client_network.gd
# Add at the beginning of start_client() function

func start_client(host: String, port: int, singleplayer: bool = false) -> void:
    # In HTML5 mode, don't use old multiplayer - use match_bridge instead
    if OS.has_feature("javascript"):
        Logger.print(self, "HTML5 mode: Skipping old multiplayer connection. Using match_bridge for backend integration.")
        return
    
    # Only use old multiplayer in desktop mode
    is_singleplayer = singleplayer
    # ... rest of existing function code ...

