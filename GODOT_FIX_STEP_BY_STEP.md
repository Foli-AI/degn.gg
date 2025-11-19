# 🎮 SOL BIRD GODOT FIX - Step-by-Step Instructions

## ✅ PROJECT STRUCTURE CONFIRMED

Your project has:
- ✅ `res://client/world/world.gd` - Client world script
- ✅ `res://common/world/world.gd` - Common world script  
- ✅ `res://client/client_network.gd` - Client networking
- ✅ `res://common/main.gd` - Main entry point
- ✅ `res://common/world/level_generator.gd` - Level generation
- ✅ `res://common/world/obstacle_spawner.gd` - Obstacle spawner (exists but not used correctly)
- ✅ `res://net/match_bridge.gd` - Already set up as autoload!

---

## 🚨 CRITICAL ISSUES FOUND

1. **Line 56 in `client/world/world.gd`** - Null position error
2. **Line 20 in `common/main.gd`** - References non-existent `$World/ObstacleSpawner`
3. **Line 8 in `client/world/world.gd`** - References `$ObstacleSpawner` but not used
4. **Line 143 in `project.godot`** - Still has `jibby.games` URL
5. **Coin system** - Still active, needs removal
6. **Menu system** - May still load despite skip logic

---

## 📋 STEP-BY-STEP FIXES

### **STEP 1: Fix project.godot - Remove Jibby Server URL**

**Action:**
1. Open Godot Editor
2. Go to **Project → Project Settings**
3. Click **"game"** in the left sidebar
4. Find **"config/server_domain_url"**
5. Change value from: `https://jibby.games`
6. To: `https://degn-gg-1.onrender.com` (or your backend URL)
7. Click **"Close"**

**OR manually edit:**
1. Open `project.godot` in a text editor
2. Find line 143: `config/server_domain_url="https://jibby.games"`
3. Change to: `config/server_domain_url="https://degn-gg-1.onrender.com"`
4. Save file

---

### **STEP 2: Fix client/world/world.gd - Remove ObstacleSpawner Reference & Fix Null Position**

**Action:**
1. Open Godot Editor
2. Open file: `res://client/world/world.gd`
3. Scroll to **line 8**
4. **DELETE this line:**
   ```gdscript
   onready var obstacle_spawner := $ObstacleSpawner
   ```

5. Scroll to **line 56** (in `_process()` function)
6. **FIND this code:**
   ```gdscript
   if cam_x + spawn_distance_ahead > last_spawn_x:
       var new_obstacle: Node2D = level_generator.spawn_obstacle(last_spawn_x)
       last_spawn_x = new_obstacle.position.x
   ```

7. **REPLACE with:**
   ```gdscript
   if cam_x + spawn_distance_ahead > last_spawn_x:
       var new_obstacle: Node2D = level_generator.spawn_obstacle(last_spawn_x)
       if new_obstacle != null:
           last_spawn_x = new_obstacle.position.x
       else:
           # If spawn failed, advance spawn point anyway to prevent infinite loop
           last_spawn_x += 500
   ```

8. Scroll to **lines 58-65** (coin spawning code)
9. **DELETE this entire block:**
   ```gdscript
   # Spawn coins as the camera moves forward
   if coin_spawner and current_player:
       var spawn_x = current_player.position.x + 500
       var y_pos = rand_range(200, 600)

       var coin = coin_spawner.spawn_at(spawn_x, y_pos)
       if coin:
           coin.connect("item_taken", self, "_on_coin_taken")
   ```

10. Scroll to **line 9** (coin_spawner reference)
11. **DELETE this line:**
    ```gdscript
    onready var coin_spawner = $CoinSpawner
    ```

12. Scroll to **lines 390-403** (`_on_coin_taken` function)
13. **DELETE the entire `_on_coin_taken` function**

14. Scroll to **line 35** (coin counter initialization)
15. **DELETE lines 35-37:**
    ```gdscript
    if has_node("UI/CoinCounter"):
        var counter = $UI/CoinCounter
        counter.add_coins(1)
    ```

16. **Save the file**

---

### **STEP 3: Fix common/main.gd - Remove ObstacleSpawner Reference**

**Action:**
1. Open Godot Editor
2. Open file: `res://common/main.gd`
3. Scroll to **line 20**
4. **DELETE this line:**
   ```gdscript
   onready var spawner = $World/ObstacleSpawner
   ```

5. Scroll to **lines 21-23** (spawn timer code)
6. **DELETE these lines:**
   ```gdscript
   var spawn_timer := 0.0
   var spawn_interval := 1.5   # Spawn every 1.5s adjust as needed
   var scroll_speed := 200
   ```

7. **Save the file**

---

### **STEP 4: Fix common/world/level_generator.gd - Fix Array Index Error**

**Action:**
1. Open Godot Editor
2. Open file: `res://common/world/level_generator.gd`
3. Scroll to **line 157** (in `spawn_obstacle` function)
4. **FIND this code:**
   ```gdscript
   if obstacle_index >= generated_obstacles.size():
       Logger.print(self, "Tried spawning obstacle %d but only %d exist!" 
           % [obstacle_index, generated_obstacles.size()])
       return
   if spawned_obstacles.has(obstacle_index):
       # Obstacle already spawned
       return
   var obstacle = generated_obstacles[obstacle_index]
   ```

5. **REPLACE with:**
   ```gdscript
   # Safety check: ensure obstacle_index is valid
   if obstacle_index < 0 or obstacle_index >= generated_obstacles.size():
       Logger.print(self, "Invalid obstacle_index %d (array size: %d)" 
           % [obstacle_index, generated_obstacles.size()])
       return null
   if spawned_obstacles.has(obstacle_index):
       # Obstacle already spawned, return existing
       return spawned_obstacles[obstacle_index]
   var obstacle = generated_obstacles[obstacle_index]
   if obstacle == null:
       Logger.print(self, "Obstacle at index %d is null!" % obstacle_index)
       return null
   ```

6. Scroll to the **end of the `spawn_obstacle` function** (around line 161)
7. **FIND:**
   ```gdscript
   call_deferred("add_child", obstacle)
   ```

8. **REPLACE with:**
   ```gdscript
   call_deferred("add_child", obstacle)
   return obstacle
   ```

9. **Save the file**

---

### **STEP 5: Remove Coin System from Player**

**Action:**
1. Open Godot Editor
2. Open file: `res://common/world/player/player.gd`
3. Scroll to **line 152** (`add_coin` function)
4. **FIND:**
   ```gdscript
   func add_coin(amount: int = 1) -> void:
       coins += amount
       emit_signal("coins_changed", self)
       Logger.print(self, "Player %s got a coin! Coins = %d" % [self.name, coins])
       # Send coin update to backend
       send_coin_update()
   ```

5. **REPLACE with:**
   ```gdscript
   func add_coin(amount: int = 1) -> void:
       # Coins removed - this function kept for compatibility but does nothing
       pass
   ```

6. Scroll to **lines 199-206** (`send_coin_update` function)
7. **REPLACE with:**
   ```gdscript
   func send_coin_update() -> void:
       # Coins removed - no longer sending updates
       pass
   ```

8. **Save the file**

---

### **STEP 6: Verify MatchBridge is Working**

**Action:**
1. Open Godot Editor
2. Go to **Project → Project Settings**
3. Click **"autoload"** tab
4. Verify **"MatchBridge"** is listed with path: `res://net/match_bridge.gd`
5. If it's NOT there:
   - Click **"+"** button
   - Name: `MatchBridge`
   - Path: `res://net/match_bridge.gd`
   - Click **"Add"**

6. **Close Project Settings**

---

### **STEP 7: Verify client_network.gd HTML5 Skip is Working**

**Action:**
1. Open Godot Editor
2. Open file: `res://client/client_network.gd`
3. Scroll to **line 53** (HTML5 check)
4. **VERIFY this code exists:**
   ```gdscript
   if OS.has_feature("javascript"):
       # Get username from query params
       var username = _get_query_param("username")
       if username and username != "":
           Globals.player_name = username
       else:
           Globals.player_name = "Player"
       
       # Skip all menus - go straight to world scene
       Logger.print(self, "HTML5 mode: Skipping menus, loading world scene directly")
       change_scene(world_scene)
   ```

5. If this code is NOT there, **ADD it** (replace the `_ready()` function)

6. **Save the file**

---

### **STEP 8: Remove Coin UI References**

**Action:**
1. Open Godot Editor
2. Open file: `res://client/world/world.gd`
3. Scroll to **line 339** (`_on_Player_coins_changed` function)
4. **FIND:**
   ```gdscript
   func _on_Player_coins_changed(player: CommonPlayer) -> void:
       # Only update for the camera target
       if int(player.name) == camera_target_id:
           $UI.update_coins(player.coins)
           $MainCamera.add_trauma(0.3)
   ```

5. **REPLACE with:**
   ```gdscript
   func _on_Player_coins_changed(player: CommonPlayer) -> void:
       # Coins removed - function kept for compatibility
       pass
   ```

6. **Save the file**

---

### **STEP 9: Fix Winner Detection (Finish Line)**

**Action:**
1. Open Godot Editor
2. Open file: `res://common/world/player/player.gd`
3. Scroll to **line 178** (`finish` function)
4. **VERIFY this code exists:**
   ```gdscript
   func finish() -> void:
       if is_finished:
           return
       is_finished = true
       add_score()
       emit_signal("finish", self)
       # Send finish event to backend
       send_finish_event()
   ```

5. If `send_finish_event()` is NOT there, **ADD it** (lines 209-220 should exist)

6. **Save the file**

---

### **STEP 10: Test in Godot Editor**

**Action:**
1. In Godot Editor, press **F5** to run the game
2. Check the **Output** panel for errors
3. If you see errors, note them and report back

---

## ✅ CHECKLIST

After completing all steps, verify:

- [ ] `project.godot` - jibby.games URL removed
- [ ] `client/world/world.gd` - ObstacleSpawner reference removed
- [ ] `client/world/world.gd` - Null check added for obstacle position
- [ ] `client/world/world.gd` - Coin spawning code removed
- [ ] `common/main.gd` - ObstacleSpawner reference removed
- [ ] `common/world/level_generator.gd` - Array bounds check added
- [ ] `common/world/player/player.gd` - Coin functions disabled
- [ ] MatchBridge autoload verified
- [ ] HTML5 menu skip verified

---

## 🚀 NEXT STEPS

After fixing all issues:

1. **Export as HTML5:**
   - Go to **Project → Export**
   - Select **"HTML5"**
   - Click **"Export Project"**
   - Export to: `degn-arcade/public/games/sol-bird/client/`

2. **Test the game:**
   - Load in browser
   - Check console for errors
   - Verify game starts without menus
   - Verify obstacles spawn correctly
   - Verify finish line works

---

## 📝 REPORT BACK

After completing each step, let me know:
- ✅ Which step you completed
- ❌ Any errors you encountered
- ❓ Any questions about the instructions

**Start with STEP 1 and work through them in order!**

