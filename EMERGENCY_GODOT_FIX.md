# Emergency Fix - spawn_obstacle Error

## The Problem
Your game is calling `spawn_obstacle()` on the wrong node. The error says it's in `world.gd` at line 57.

## The Quick Fix (5 Minutes)

### Step 1: Open Godot Project
1. Open Godot Editor
2. Open your Flappy Race project

### Step 2: Find the Error
1. Open `client/world/world.gd` (or just `world.gd`)
2. Press `Ctrl+F` to search
3. Search for: `spawn_obstacle`
4. OR go to line 57 in `_process()` function

### Step 3: Fix It

**Find this (or similar):**
```gdscript
func _process(delta):
    # ... other code ...
    $ObstacleSpawner.spawn_obstacle(position)  # ← THIS IS WRONG
    # OR
    obstacle_spawner.spawn_obstacle(position)  # ← THIS IS WRONG
```

**Change to:**
```gdscript
func _process(delta):
    # ... other code ...
    $LevelGenerator.spawn_obstacle(position)  # ← CORRECT
    # OR if you have a reference:
    level_generator.spawn_obstacle(position)  # ← CORRECT
```

### Step 4: Check Your Scene

1. Open your world scene (`world.tscn`)
2. Check if you have:
   - `LevelGenerator` node ✓
   - `ObstacleSpawner` node (might not exist)
3. If `LevelGenerator` exists, use that
4. If neither exists, check what nodes you DO have

### Step 5: Alternative Fix

If `LevelGenerator` doesn't exist either, you might need to:

**Option A: Remove the call entirely** (if obstacles spawn via signals):
```gdscript
func _process(delta):
    # Remove the spawn_obstacle call
    # Obstacles should spawn via chunk_tracker signals
    pass
```

**Option B: Add the function to obstacle_spawner**:
1. Open `obstacle_spawner.gd`
2. Add this function:
```gdscript
func spawn_obstacle(position: Vector2) -> void:
    # Add your obstacle spawning code here
    var obstacle = preload("res://path/to/obstacle.tscn").instance()
    obstacle.position = position
    add_child(obstacle)
```

## If You Can't Find world.gd

1. In Godot, go to **File System** (bottom left)
2. Search for: `world.gd`
3. Double-click to open
4. Look for `_process()` function
5. Find line 57 (or search for `spawn_obstacle`)

## If You Don't Have Godot Project

You need to:
1. Get the Godot project files
2. Or rebuild the game in a different engine
3. Or use a pre-built game template

## Still Stuck?

Share with me:
1. Your `world.gd` file (or screenshot)
2. Your scene structure (screenshot of node tree)
3. What nodes exist in your world scene

And I'll tell you exactly what to change!

