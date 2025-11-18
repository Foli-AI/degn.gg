# UPDATED: common/world/world.gd
# Changes: Added finish order tracking and backend integration

extends Node2D

class_name CommonWorld

const STARTING_JUMP := 500

enum Difficulty {
	VERY_EASY,
	EASY,
	MEDIUM,
	HARD,
	VERY_HARD,
}

export(PackedScene) var Player
export(Array) var SpawnableObjects

var new_players := []
var game_seed := 0
var game_rng := RandomNumberGenerator.new()
var game_options := {} setget set_game_options
var is_active = false
var leaderboard = []
# Dictionary of all players in the current game
# Includes player preferences and a reference to the player body if playing
var player_list := {}
# Array of all spawned player bodies
var spawned_players := []

# NEW: Finish order tracking for backend
var finish_order := []  # Array of { player_id, finish_time, coins }
var next_place := 1
var match_start_time := 0.0
var round_timer_ms := 180000  # 3 minutes default
var round_end_timer: Timer = null

onready var level_generator = $LevelGenerator as LevelGenerator
onready var chunk_tracker = $ChunkTracker as ChunkTracker
onready var bridge = get_node("/root/MatchBridge")

func _ready() -> void:
	chunk_tracker.connect("load_chunk", level_generator, "spawn_obstacle")
	chunk_tracker.connect("unload_chunk", level_generator, "despawn_obstacle")
	Logger.print(self, "World ready!")

	# Hook into match_bridge signals (if autoload match_bridge exists)
	if bridge:
		# match_bridge will emit signals: game_start(evt), player_update(evt), game_end(evt)
		# evt is expected to be a Dictionary { "type": "...", "payload": {...} }
		bridge.connect("game_start", self, "_on_match_game_start")
		bridge.connect("player_update", self, "_on_match_player_update")
		bridge.connect("game_end", self, "_on_match_game_end")
	else:
		Logger.print(self, "MatchBridge not found. Multiplayer glue disabled.")


# Randomises the current game RNG seed and returns it
func randomize_game_seed() -> int:
	game_rng.randomize()
	Logger.print(self, "Generated random seed: %d" % [game_rng.seed])
	return game_rng.seed


# Sets the game RNG seed
func set_game_seed(new_seed: int) -> void:
	game_seed = new_seed
	game_rng.seed = new_seed
	Logger.print(self, "Set game seed to: %d" % [new_seed])


func set_game_options(new_game_options: Dictionary) -> void:
	game_options = new_game_options
	Logger.print(self, "Set game options to: %s" % [new_game_options])


func start_game(
	new_game_seed: int, new_game_options: Dictionary, new_player_list: Dictionary
) -> void:
	Logger.print(
		self,
		(
			"Starting game with seed = %d, game options: %s and players: %s"
			% [new_game_seed, new_game_options, new_player_list]
		)
	)
	set_game_seed(new_game_seed)
	set_game_options(new_game_options)
	self.player_list = new_player_list
	chunk_tracker.chunk_limit = game_options.goal
	level_generator.generate(game_rng, game_options.goal)


func start_countdown() -> void:
	reset_players()


func reset_players() -> void:
	# Delete all existing players
	for player in spawned_players:
		spawned_players.erase(player)
		player.queue_free()
	for player_id in player_list:
		player_list[player_id].score = 0
	spawn_player_list(player_list)

func _leader_cmp(a, b):
	return int(a.get("coins", 0)) > int(b.get("coins", 0))


func spawn_player_list(_player_list: Dictionary) -> void:
	Logger.print(self, "Spawning players in list: %s" % [_player_list])
	for player_id in _player_list:
		var player_entry = _player_list[player_id]
		# Don't spawn any spectators
		if player_entry.spectate == true:
			continue
		var player_body := spawn_player(player_id, Vector2.ZERO, player_entry.bot)
		player_entry["body"] = player_body
		spawned_players.append(player_body)
		chunk_tracker.add_player(player_id, player_entry.score)


func spawn_player(player_id: int, spawn_position: Vector2, is_bot: bool) -> Node2D:
	if not has_node(str(player_id)):
		Logger.print(self, "Spawning player %d" % [player_id])
		var player = Player.instance()
		player.connect("death", self, "_on_Player_death")
		player.connect("score_changed", self, "_on_Player_score_changed")
		player.connect("finish", self, "_on_Player_finish")
		player.name = str(player_id)
		player.position = spawn_position
		player.enable_movement = false
		player.is_bot = is_bot
		player.finish_line_position = level_generator.finish_line.position
		add_child(player)
		return player
	return null


func despawn_player(player_id: int) -> void:
	Logger.print(self, "Despawning player %d" % [player_id])
	var player = get_node_or_null(str(player_id))
	if player:
		spawned_players.erase(player)
		player.despawn()
		if spawned_players.empty():
			# Everyone is dead/finished
			end_race()


#### Player helper functions
func get_lead_player() -> Node2D:
	var leader
	for player in spawned_players:
		if leader == null or player.position.x > leader.position.x:
			leader = player
	return leader

func _on_Player_death(player: CommonPlayer) -> void:
	player.set_enable_movement(false)
	var player_id = int(player.name)
	Logger.print(self, "Player %s died at %s!" % [player_id, player.position])


func _on_Player_score_changed(player: CommonPlayer) -> void:
	var player_id = int(player.name)
	Logger.print(self, "Player %s scored a point!" % [player_id])
	chunk_tracker.increment_player_chunk(player_id)


# UPDATED: Track finish order and send to backend
func _on_Player_finish(player: CommonPlayer) -> void:
	var player_id = int(player.name)
	var finish_time = OS.get_ticks_msec() - match_start_time
	var place = next_place
	next_place += 1
	
	Logger.print(self, "Player %s crossed the finish line! Place: %d, Time: %d ms" % [player_id, place, finish_time])
	
	# Track finish order
	finish_order.append({
		"player_id": str(player_id),
		"place": place,
		"finish_time": finish_time,
		"coins": player.coins
	})
	
	# Check if all players finished
	check_all_players_finished()
	
	despawn_player(player_id)


# NEW: Check if all players finished and send rankings
func check_all_players_finished() -> void:
	# Count how many players have finished
	var finished_count = finish_order.size()
	var total_players = spawned_players.size() + finish_order.size()
	
	Logger.print(self, "Finished: %d / %d players" % [finished_count, total_players])
	
	# If all players finished, send rankings to backend
	if finished_count >= total_players and total_players > 0:
		send_rankings_to_backend()
	# Also check if timer expired (handled in _on_round_timer_expired)


func end_race() -> void:
	Logger.print(self, "Race finished!")
	# If race ended but not all finished, send current rankings
	if finish_order.size() > 0:
		send_rankings_to_backend()


# NEW: Send rankings to backend via WebSocket
func send_rankings_to_backend() -> void:
	if not OS.has_feature("javascript"):
		Logger.print(self, "Not in HTML5, skipping backend rankings send")
		return
	
	# Sort by place (1st, 2nd, 3rd, etc.)
	finish_order.sort_custom(self, "_sort_finish_order")
	
	# Build rankings array
	var rankings = []
	for entry in finish_order:
		rankings.append({
			"playerId": entry.player_id,
			"position": entry.place,
			"coins": entry.coins,
			"finishTime": entry.finish_time
		})
	
	# Also add players who didn't finish (with 0 coins)
	for player in spawned_players:
		var player_id = str(player.name)
		var already_finished = false
		for entry in finish_order:
			if entry.player_id == player_id:
				already_finished = true
				break
		if not already_finished:
			rankings.append({
				"playerId": player_id,
				"position": 999,  # Didn't finish
				"coins": player.coins,
				"finishTime": -1
			})
	
	# Send to backend
	JavaScript.eval("""
		if (typeof window.sendMatchResult === 'function') {
			window.sendMatchResult(%s);
		}
	""" % JSON.print(rankings), true)
	
	Logger.print(self, "Sent rankings to backend: %s" % rankings)


func _sort_finish_order(a, b) -> bool:
	return a.place < b.place


#
# Match events handlers (integrate with backend via match_bridge)
#

func _on_match_game_start(evt: Dictionary) -> void:
	# evt may be a wrapper: { "type": "GAME_START", "payload": { ... } }
	var payload = evt.get("payload", evt)
	Logger.print(self, "Received GAME_START payload: %s" % [payload])

	# Reset finish tracking
	finish_order.clear()
	next_place = 1
	match_start_time = OS.get_ticks_msec()
	
	# Get round timer from payload (3 minutes = 180000 ms)
	if payload.has("roundTimer"):
		round_timer_ms = int(payload.roundTimer)
		# Start timer
		if round_end_timer != null:
			round_end_timer.queue_free()
		round_end_timer = Timer.new()
		round_end_timer.wait_time = round_timer_ms / 1000.0  # Convert ms to seconds
		round_end_timer.one_shot = true
		round_end_timer.connect("timeout", self, "_on_round_timer_expired")
		add_child(round_end_timer)
		round_end_timer.start()
		Logger.print(self, "Started round timer: %d seconds" % round_end_timer.wait_time)

	# Example payload keys we expect: players (array or dict), seed, gameOptions, pot, roundTimer
	# Reset local state and spawn players according to server authoritative list
	is_active = true
	leaderboard.clear()

	# If server sends a player list in payload, use it to set player_list
	if payload.has("players"):
		# payload.players might be an Array or Dictionary — handle both
		var p = payload.players
		var new_players = {}
		if typeof(p) == TYPE_ARRAY:
			# convert array into dictionary keyed by playerId (if items include playerId)
			for item in p:
				if typeof(item) == TYPE_DICTIONARY and item.has("playerId"):
					var pid = str(item.playerId)
					new_players[pid] = {
						"name": item.get("username", "Player"),
						"colour": item.get("colour", 0),
						"spectate": false,
						"bot": false,
						"score": 0,
						"coins": 0
					}
		elif typeof(p) == TYPE_DICTIONARY:
			new_players = p
		player_list = new_players
	else:
		# no player list provided — keep existing player_list as-is
		pass

	# Optionally store pot / options if sent
	if payload.has("pot"):
		game_options.pot = payload.pot
	if payload.has("seed"):
		set_game_seed(int(payload.seed))
	if payload.has("gameOptions"):
		set_game_options(payload.gameOptions)

	# Reset and spawn players (reuse existing reset_players / spawn_player_list)
	reset_players()

	# If server indicates a starting countdown / auto-enable movement after short delay:
	if payload.has("roundTimer"):
		# small delay before enabling movement (optional)
		yield(get_tree().create_timer(0.5), "timeout")
		for pbody in spawned_players:
			if pbody:
				pbody.set_enable_movement(true)


# NEW: Handle round timer expiration
func _on_round_timer_expired() -> void:
	Logger.print(self, "Round timer expired! Sending current rankings to backend.")
	# Stop all players
	for player in spawned_players:
		player.set_enable_movement(false)
	
	# Send current rankings (players who finished + players who didn't)
	send_rankings_to_backend()
	
	# Game will end when backend sends GAME_END event


func _on_match_player_update(evt: Dictionary) -> void:
	# Called when backend broadcasts a player's coin/score updates
	var payload = evt.get("payload", evt)
	# Expecting: { playerId: "<id>", coins: 5, score: 123, status: "alive" }
	var pid = str(payload.get("playerId", payload.get("player_id", "")))
	if pid == "":
		return

	# Update server-authoritative score / coins in player_list
	if player_list.has(pid):
		var entry = player_list[pid]
		# write back coins/score if provided
		if payload.has("coins"):
			entry.coins = int(payload.coins)
		if payload.has("score"):
			entry.score = int(payload.score)
		player_list[pid] = entry
	else:
		# if player wasn't known, add a minimal entry
		player_list[pid] = {"coins": payload.get("coins", 0), "score": payload.get("score", 0)}

	# Mirror updates to the spawned player body if present
	var body = get_node_or_null(pid)
	if body:
		# If your player has a public field to represent coins/score, set it
		if body.has_method("set_coins"):
			body.set_coins(int(player_list[pid].get("coins", 0)))
		elif body.has_variable("coins"):
			body.coins = int(player_list[pid].get("coins", 0))
		# Optionally update UI or chunk tracker based on score change
		if payload.has("score"):
			chunk_tracker.increment_player_chunk(int(pid))

	# Update local leaderboard array (simple upsert)
	var found = false
	for i in range(leaderboard.size()):
		if leaderboard[i].get("playerId", "") == pid:
			leaderboard[i]["coins"] = int(player_list[pid].get("coins", 0))
			leaderboard[i]["score"] = int(player_list[pid].get("score", 0))
			found = true
			break
	if not found:
		leaderboard.append({
			"playerId": pid,
			"coins": int(player_list[pid].get("coins", 0)),
			"score": int(player_list[pid].get("score", 0))
		})

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

	# Show end-of-race logic
	Logger.print(self, "Match ended. Rankings: %s" % [payload.get("rankings", [])])
	
	# Show leaderboard from backend rankings
	if payload.has("rankings"):
		show_backend_leaderboard(payload.rankings)
	
	# Call existing end_race() hook so the rest of the game flow continues
	end_race()


# NEW: Show leaderboard from backend rankings
func show_backend_leaderboard(rankings: Array) -> void:
	# Sort rankings by position
	rankings.sort_custom(self, "_sort_rankings_by_position")
	
	# Update leaderboard
	leaderboard.clear()
	for entry in rankings:
		leaderboard.append({
			"playerId": str(entry.get("playerId", "")),
			"position": entry.get("position", 999),
			"payout": entry.get("payout", 0),
			"coins": entry.get("coins", 0)
		})
	
	Logger.print(self, "Updated leaderboard from backend: %s" % leaderboard)


func _sort_rankings_by_position(a, b) -> bool:
	return a.get("position", 999) < b.get("position", 999)


func spawn_object(object_id: int, properties: Dictionary) -> void:
	var inst := SpawnableObjects[object_id].instance() as Node
	for property_key in properties:
		inst.set(property_key, properties[property_key])
	Logger.print(self, "Spawning object: %s Properties: %s", [inst.name, properties])
	add_child(inst)

