# Detailed Fix for spawn_obstacle Error

## The Error
```
Invalid call. Nonexistent function 'spawn_obstacle' in base 'Node2D (obstacle_spawner.gd)'.
at: _process (res://client/world/world.gdc:57)
```

## What This Means
The error is happening in `world.gd` at line 57, in the `_process()` function. The code is trying to call `spawn_obstacle()` on a node called `obstacle_spawner`, but that function doesn't exist on that node.

## The Solution

### Option 1: Check What Node Should Be Called

In `world_common.gd` line 45, you have:
```gdscript
chunk_tracker.connect("load_chunk", level_generator, "spawn_obstacle")
```

This means `spawn_obstacle()` should be called on `level_generator`, NOT `obstacle_spawner`.

### Step-by-Step Fix:

1. **Open your Godot project**

2. **Open `client/world/world.gd`** (or wherever your world script is)

3. **Find the `_process()` function** (around line 57)

4. **Look for any calls to `obstacle_spawner`**:
   ```gdscript
   # WRONG - Don't do this:
   $ObstacleSpawner.spawn_obstacle(position)
   # OR
   obstacle_spawner.spawn_obstacle(position)
   ```

5. **Replace with the correct node**:
   ```gdscript
   # CORRECT - Use LevelGenerator instead:
   $LevelGenerator.spawn_obstacle(position)
   # OR if you have a reference:
   level_generator.spawn_obstacle(position)
   ```

### Option 2: If obstacle_spawner Should Have the Function

If `obstacle_spawner` is supposed to have `spawn_obstacle()`, then you need to add it:

1. **Open `obstacle_spawner.gd`**

2. **Add this function**:
   ```gdscript
   func spawn_obstacle(position: Vector2) -> void:
       # Your obstacle spawning logic here
       # Example:
       var obstacle = obstacle_scene.instance()
       obstacle.position = position
       add_child(obstacle)
   ```

### Option 3: Check Your Scene Structure

The issue might be that the node path is wrong. Check:

1. **Open your world scene** (`world.tscn`)

2. **Check the node structure**:
   - Is there a `LevelGenerator` node?
   - Is there an `ObstacleSpawner` node?
   - What are their actual names in the scene?

3. **Update the code to match your scene**:
   ```gdscript
   # If your node is named differently, use the correct path:
   $YourActualNodeName.spawn_obstacle(position)
   ```

## Quick Diagnostic Steps

1. **In Godot Editor, open your world scene**

2. **Check the node tree** - look for:
   - `LevelGenerator` node
   - `ObstacleSpawner` node
   - Any other nodes related to obstacles

3. **Check what scripts are attached**:
   - Right-click each node → "Open Script"
   - See what functions they have

4. **In `world.gd`, check line 57** (or around there in `_process()`):
   - What is it trying to call?
   - What node is it calling on?

## Most Likely Fix

Based on the `world_common.gd` code, the fix is probably:

**In `world.gd` `_process()` function, change:**
```gdscript
# WRONG:
$ObstacleSpawner.spawn_obstacle(some_position)

# CORRECT:
$LevelGenerator.spawn_obstacle(some_position)
```

OR if you're using a signal connection (which is better):
```gdscript
# Make sure you have this in _ready():
chunk_tracker.connect("load_chunk", level_generator, "spawn_obstacle")
```

And remove any direct calls to `spawn_obstacle()` in `_process()`.

## If You Can't Find It

If you can't find where `spawn_obstacle` is being called:

1. **Search entire project** for `spawn_obstacle`:
   - Press `Ctrl+Shift+F` in Godot
   - Search: `spawn_obstacle`
   - This will show all files using it

2. **Check compiled scripts**:
   - The error says `world.gdc:57` (compiled)
   - But the source should be `world.gd`
   - Make sure you're editing the `.gd` file, not `.gdc`

3. **Check if it's in a signal connection**:
   - Look for `connect()` calls
   - Make sure the target node and function name are correct

## Need More Help?

If you share:
1. Your `world.gd` file (especially the `_process()` function)
2. Your `obstacle_spawner.gd` file (if it exists)
3. Your `level_generator.gd` file
4. A screenshot of your world scene node tree

I can tell you exactly what to change.

