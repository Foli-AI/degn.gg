# 🚨 CRITICAL FIX: Indentation Error in level_generator.gd

## Problem
The `spawn_obstacle` function has **mixed indentation** (spaces + tabs), causing a parse error. GDScript requires consistent indentation.

## Solution

**Open file:** `res://common/world/level_generator.gd` in Godot Editor

**Scroll to line 145** (the `spawn_obstacle` function)

**FIND this entire function (lines 145-162):**
```gdscript
func spawn_obstacle(obstacle_index: int) -> void:
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
	spawned_obstacles[obstacle_index] = obstacle
	Logger.print(self, "Spawning %s at %s", [obstacle.name, obstacle.position])
	# Defer because we can't spawn areas during a collision notification
	call_deferred("add_child", obstacle)
	return obstacle
```

**REPLACE with this (using TABS, not spaces):**
```gdscript
func spawn_obstacle(obstacle_index: int) -> Node2D:
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
	spawned_obstacles[obstacle_index] = obstacle
	Logger.print(self, "Spawning %s at %s", [obstacle.name, obstacle.position])
	# Defer because we can't spawn areas during a collision notification
	call_deferred("add_child", obstacle)
	return obstacle
```

## Key Changes:
1. **Changed return type** from `-> void` to `-> Node2D` (because we return a Node2D)
2. **Fixed indentation** - All lines now use **TABS** (not spaces) to match the rest of the file
3. **Consistent indentation** - All if statements and code blocks are properly indented with tabs

## How to Fix in Godot:

1. Open Godot Editor
2. Open `res://common/world/level_generator.gd`
3. Select lines 145-162
4. Delete them
5. Paste the corrected version above
6. **IMPORTANT:** Make sure you're using **TABS** (press Tab key), not spaces
7. Save the file (Ctrl+S)
8. The error should disappear

## Verify:
After saving, check the **Output** panel in Godot - there should be no parse errors.

