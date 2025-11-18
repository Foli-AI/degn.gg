# 🎮 Godot Node & Scene Changes Guide

**Status:** ✅ Checklist ready | Step-by-step instructions

---

## ✅ **What's Already Set Up**

### **1. MatchBridge Autoload** ✅
**Location:** `project.godot` → `[autoload]` section

**Status:** Already configured!
```
MatchBridge="*res://net/match_bridge.gd"
```

**Verify:**
1. Open **Project → Project Settings**
2. Go to **Autoload** tab
3. Check that `MatchBridge` is listed:
   - Path: `res://net/match_bridge.gd`
   - Node Name: `MatchBridge`
   - Enable: ✅ (checked)

**If NOT there:**
1. Click **Add** button
2. Path: `res://net/match_bridge.gd`
3. Node Name: `MatchBridge`
4. Enable: ✅
5. Click **Add**

---

## 📋 **Required Changes**

### **1. Verify MatchBridge Autoload** ✅
**Action:** Check that it's already set (it should be)

**File:** `project.godot`

**Current Status:** ✅ Already configured (line 129)

---

### **2. No Scene Structure Changes Needed** ✅
**Good News:** The existing scene structure is already correct!

**Scenes that work as-is:**
- ✅ `client/world/world.tscn` - Already has all needed nodes
- ✅ `client/client_network.tscn` - Already has Network node and timers
- ✅ `common/world/world.tscn` - Base world scene (inherited by client world)

---

### **3. Verify World Scene Has Required Nodes** ✅

**File:** `client/world/world.tscn`

**Required Nodes (should already exist):**
- ✅ `World` (root node, extends CommonWorld)
- ✅ `UI` (UI layer)
- ✅ `MainCamera` (camera)
- ✅ `LevelGenerator` (level generation)
- ✅ `ChunkTracker` (chunk tracking)
- ✅ `ObstacleSpawner` (obstacle spawning)
- ✅ `CoinSpawner` (coin spawning)
- ✅ `MusicPlayer` (music)
- ✅ `FinishMusic` (finish sound)
- ✅ `FinishChime` (finish chime)

**Check:**
1. Open `client/world/world.tscn` in Godot
2. Verify all nodes listed above exist
3. If any are missing, add them (but they should all be there)

---

### **4. Verify Client Network Scene** ✅

**File:** `client/client_network.tscn`

**Required Nodes (should already exist):**
- ✅ `Client` (root node)
- ✅ `Network` (child node, has `client_network.gd` script)
- ✅ `Network/LatencyUpdater` (Timer node)
- ✅ `Network/ClockSyncTimer` (Timer node)

**Check:**
1. Open `client/client_network.tscn` in Godot
2. Verify structure matches above
3. Verify `Network` node has `client_network.gd` script attached

---

## 🔧 **Step-by-Step Verification**

### **Step 1: Check Autoloads**
1. Open Godot
2. Go to **Project → Project Settings**
3. Click **Autoload** tab
4. Verify `MatchBridge` is listed:
   ```
   MatchBridge | res://net/match_bridge.gd | ✅
   ```
5. If missing, add it (see above)

---

### **Step 2: Verify MatchBridge Script**
1. Navigate to `net/match_bridge.gd` in FileSystem
2. Open the file
3. Verify it has:
   - `extends Node`
   - `signal game_start(evt)`
   - `signal player_update(evt)`
   - `signal game_end(evt)`
   - `_process()` function that polls `window.latestMatchEvent`

**If file doesn't exist:**
- Create it at `net/match_bridge.gd`
- Copy from your existing file (it should already exist)

---

### **Step 3: Check World Scene Script**
1. Open `client/world/world.tscn`
2. Select `World` root node
3. Check **Inspector** panel
4. Verify **Script** property points to: `res://client/world/world.gd`

**If wrong:**
- Click script icon next to Script property
- Select `res://client/world/world.gd`

---

### **Step 4: Check Common World Script**
1. Open `common/world/world.tscn`
2. Select `World` root node
3. Check **Inspector** panel
4. Verify **Script** property points to: `res://common/world/world.gd`

**If wrong:**
- Click script icon
- Select `res://common/world/world.gd`

---

### **Step 5: Verify Node Paths in Scripts**

**In `common/world/world.gd`:**
- Line 40: `onready var level_generator = $LevelGenerator`
- Line 41: `onready var chunk_tracker = $ChunkTracker`
- Line 42: `onready var bridge = get_node("/root/MatchBridge")`

**Verify these nodes exist:**
1. Open `common/world/world.tscn`
2. Check that `LevelGenerator` node exists
3. Check that `ChunkTracker` node exists
4. Verify `MatchBridge` autoload (from Step 1)

---

## ⚠️ **Common Issues & Fixes**

### **Issue 1: "MatchBridge not found"**
**Error:** Script can't find MatchBridge autoload

**Fix:**
1. Go to **Project → Project Settings → Autoload**
2. Verify `MatchBridge` is listed
3. If missing, add it:
   - Path: `res://net/match_bridge.gd`
   - Node Name: `MatchBridge`
   - Enable: ✅

---

### **Issue 2: "LevelGenerator not found"**
**Error:** `$LevelGenerator` returns null

**Fix:**
1. Open `common/world/world.tscn`
2. Check that `LevelGenerator` node exists as child of `World`
3. If missing, add it:
   - Right-click `World` node
   - Add Child Node
   - Search for "LevelGenerator" or add manually
   - Attach script: `res://common/world/level_generator.gd`

---

### **Issue 3: "ChunkTracker not found"**
**Error:** `$ChunkTracker` returns null

**Fix:**
1. Open `common/world/world.tscn`
2. Check that `ChunkTracker` node exists as child of `World`
3. If missing, add it:
   - Right-click `World` node
   - Add Child Node
   - Search for "ChunkTracker" or add manually
   - Attach script: `res://common/world/chunk_tracker.gd`

---

### **Issue 4: "Network node missing"**
**Error:** Client network scene doesn't have Network node

**Fix:**
1. Open `client/client_network.tscn`
2. Check that `Network` node exists as child of `Client`
3. If missing:
   - Right-click `Client` node
   - Add Child Node → Node
   - Rename to `Network`
   - Attach script: `res://client/client_network.gd`
   - Add child Timer nodes:
     - `LatencyUpdater` (wait_time: 0.5)
     - `ClockSyncTimer` (wait_time: 5.0)

---

## ✅ **Quick Verification Checklist**

After implementing script changes, verify:

- [ ] **MatchBridge autoload** exists in Project Settings
- [ ] **`net/match_bridge.gd`** file exists and has correct code
- [ ] **`common/world/world.tscn`** has `LevelGenerator` node
- [ ] **`common/world/world.tscn`** has `ChunkTracker` node
- [ ] **`client/world/world.tscn`** has all required nodes
- [ ] **`client/client_network.tscn`** has `Network` node with script
- [ ] **Scripts are attached** to correct nodes
- [ ] **No errors** in Output panel when running

---

## 🎯 **Summary**

### **What You Need to Do:**

1. ✅ **Verify MatchBridge autoload** (should already be set)
2. ✅ **Update scripts** (player.gd, world.gd, client_network.gd)
3. ✅ **Verify scene structure** (should already be correct)
4. ✅ **Test in editor** (check for errors)

### **What You DON'T Need to Do:**

- ❌ Create new scenes
- ❌ Add new nodes (unless missing)
- ❌ Change scene hierarchy
- ❌ Modify autoloads (unless MatchBridge is missing)

---

## 🚀 **Next Steps**

1. **Verify MatchBridge autoload** (5 seconds)
2. **Update the 3 scripts** (player.gd, world.gd, client_network.gd)
3. **Test in Godot editor** (press F5, check Output panel)
4. **Export as HTML5** (Project → Export)

**That's it! The scene structure is already correct. You just need to update the scripts! 🎮**

