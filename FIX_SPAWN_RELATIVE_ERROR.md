# Fix spawn_relative Error in Godot

## The Error
```
SCRIPT ERROR: Invalid call. Nonexistent function 'spawn_relative' in base 'Node2D (obstacle_spawner.gd)'.
at: _process (res://client/world/world.gdc:57)
```

## What's Happening
The error occurs in `world.gd` at line 57 (in the compiled `.gdc` file). The code is trying to call `spawn_relative()` on an `obstacle_spawner` node, but that function doesn't exist.

## How to Fix

### Step 1: Find the obstacle_spawner script
1. Open your Godot project
2. Find the `obstacle_spawner.gd` file (or similar name)
3. Look for where it's being called from `world.gd`

### Step 2: Check what function should be called
In `world_common.gd` line 45, you have:
```gdscript
chunk_tracker.connect("load_chunk", level_generator, "spawn_obstacle")
```

So the function is likely `spawn_obstacle()`, not `spawn_relative()`.

### Step 3: Find where spawn_relative is called
Search your entire Godot project for `spawn_relative`:
1. In Godot Editor: Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
2. Search for: `spawn_relative`
3. This will show you all files where it's used

### Step 4: Replace spawn_relative
Once you find where `spawn_relative` is called, replace it with the correct function name. Common options:

**Option A: If it should call spawn_obstacle:**
```gdscript
# WRONG:
spawn_relative(position)

# CORRECT:
spawn_obstacle(position)
```

**Option B: If obstacle_spawner has a different function:**
Check what functions exist in `obstacle_spawner.gd`:
- `spawn_obstacle(position)`
- `spawn_at_position(position)`
- `spawn(position)`
- Or check the actual function name in the script

### Step 5: Check world.gd _process function
The error says it's in `_process` at line 57. Check your `world.gd` file's `_process()` function and look for any calls to obstacle_spawner that use `spawn_relative`.

**Example fix:**
```gdscript
# In world.gd _process() function
# WRONG:
$ObstacleSpawner.spawn_relative(some_position)

# CORRECT (check your actual function name):
$ObstacleSpawner.spawn_obstacle(some_position)
# OR
$LevelGenerator.spawn_obstacle(some_position)
```

## Quick Fix Checklist
- [ ] Search entire project for `spawn_relative`
- [ ] Check `obstacle_spawner.gd` to see what functions it has
- [ ] Check `world.gd` `_process()` function for obstacle spawning calls
- [ ] Replace `spawn_relative` with correct function name
- [ ] Test in Godot editor first
- [ ] Export HTML5 and test again

## If You Can't Find It
If you can't find `spawn_relative` in your source code, it might be:
1. In a compiled script (check `.gdc` files)
2. In a scene file (check `.tscn` files for script references)
3. In an autoload script

Try searching in:
- All `.gd` files
- All `.tscn` files (scene files)
- Check if there's a `LevelGenerator` or `ObstacleSpawner` node in your world scene

## Need More Help?
If you share your `obstacle_spawner.gd` and `world.gd` files, I can tell you exactly what to change.

