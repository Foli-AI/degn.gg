# Rebuild Sol Bird in Phaser.js - Complete Guide

## Why Phaser.js?

- ✅ **No export step** - Changes are instant
- ✅ **JavaScript** - Easy to debug, familiar
- ✅ **Web-native** - Built for browser games
- ✅ **Better integration** - Works seamlessly with Next.js
- ✅ **Easier maintenance** - All code in one place

## Time Estimate: 1-2 Days

---

## Step 1: Setup Phaser in Next.js

### Install Phaser
```bash
cd degn-arcade
npm install phaser
```

### Create Game Component
Create `degn-arcade/src/components/games/SolBirdGame.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface SolBirdGameProps {
  lobbyId: string;
  playerId: string;
  username: string;
  wsUrl: string;
  entryAmount: number;
  players: number;
  matchKey: string;
}

export function SolBirdGame({
  lobbyId,
  playerId,
  username,
  wsUrl,
  entryAmount,
  players,
  matchKey
}: SolBirdGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 600 },
          debug: false
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }} 
    />
  );
}

// Game scenes will go here
function preload(this: Phaser.Scene) {
  // Load assets
}

function create(this: Phaser.Scene) {
  // Initialize game
}

function update(this: Phaser.Scene) {
  // Game loop
}
```

---

## Step 2: Basic Flappy Bird Mechanics

### Player Class
```typescript
class Player extends Phaser.Physics.Arcade.Sprite {
  private jumpVelocity = -400;
  private speed = 200;
  private coins = 0;
  private isFinished = false;
  private finishLineX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, finishLineX: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.finishLineX = finishLineX;
    
    // Set physics
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
  }

  jump() {
    if (this.isFinished) return;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(this.jumpVelocity);
  }

  update() {
    // Move forward
    if (!this.isFinished) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.speed + (this.coins * 20));
    }

    // Check finish line
    if (this.x >= this.finishLineX && !this.isFinished) {
      this.finish();
    }
  }

  finish() {
    this.isFinished = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    // Send finish event to backend
    if (window.sendFinishEvent) {
      window.sendFinishEvent(this.scene.data.get('playerId'));
    }
  }

  addCoin() {
    this.coins++;
    // Send coin update
    if (window.sendCoinUpdate) {
      window.sendCoinUpdate(this.coins);
    }
  }
}
```

### Obstacle (Pipe) Class
```typescript
class Obstacle extends Phaser.Physics.Arcade.Group {
  private gap = 200;
  private speed = 200;

  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene);
  }

  spawn(x: number) {
    const topHeight = Phaser.Math.Between(100, 300);
    const bottomY = topHeight + this.gap;

    // Top pipe
    const topPipe = this.scene.add.rectangle(x, topHeight / 2, 80, topHeight, 0x00ff00);
    this.scene.physics.add.existing(topPipe);
    (topPipe.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // Bottom pipe
    const bottomPipe = this.scene.add.rectangle(x, bottomY + (720 - bottomY) / 2, 80, 720 - bottomY, 0x00ff00);
    this.scene.physics.add.existing(bottomPipe);
    (bottomPipe.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.addMultiple([topPipe, bottomPipe]);
  }

  update() {
    this.children.entries.forEach((pipe: any) => {
      pipe.x -= this.speed * 0.016; // 60fps
      if (pipe.x < -100) {
        pipe.destroy();
      }
    });
  }
}
```

---

## Step 3: Main Game Scene

```typescript
class SolBirdScene extends Phaser.Scene {
  private player!: Player;
  private obstacles!: Obstacle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private finishLineX = 10000;
  private spawnTimer = 0;
  private spawnInterval = 2000; // 2 seconds

  constructor() {
    super({ key: 'SolBirdScene' });
  }

  preload() {
    // Create simple colored rectangles for now
    this.add.graphics()
      .fillStyle(0x00ff00)
      .fillRect(0, 0, 50, 50)
      .generateTexture('player', 50, 50);
  }

  create() {
    // Create player
    this.player = new Player(this, 100, 360, this.finishLineX);
    
    // Create obstacles group
    this.obstacles = new Obstacle(this);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Collision detection
    this.physics.add.overlap(
      this.player,
      this.obstacles,
      this.hitObstacle,
      undefined,
      this
    );

    // Connect to backend WebSocket
    this.connectToBackend();
  }

  update(time: number, delta: number) {
    // Input
    if (this.cursors.up.isDown || this.spaceKey.isDown) {
      this.player.jump();
    }

    // Spawn obstacles
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.obstacles.spawn(1280);
      this.spawnTimer = 0;
    }

    // Update game objects
    this.player.update();
    this.obstacles.update();
  }

  hitObstacle() {
    // Player hit obstacle - respawn or end game
    this.player.setPosition(100, 360);
    this.player.coins = Math.max(0, this.player.coins - 3);
  }

  connectToBackend() {
    // Use existing ws-glue.js
    // It's already set up for backend communication
  }
}
```

---

## Step 4: Integrate with Backend

The existing `ws-glue.js` will work! Just make sure to:

1. **Listen for game start:**
```typescript
window.addEventListener('match:game_start', (event: any) => {
  // Start the game
  this.scene.start('SolBirdScene');
});
```

2. **Send finish event:**
```typescript
// Already in Player class
window.sendFinishEvent(playerId);
```

3. **Send coin updates:**
```typescript
// Already in Player class
window.sendCoinUpdate(coins);
```

---

## Step 5: Update Game Page

Update `degn-arcade/src/app/play/sol-bird/page.tsx`:

```tsx
import { SolBirdGame } from '@/components/games/SolBirdGame';

// ... existing code ...

return (
  <div style={{height:'100vh', width:'100%', background:'#0b0c10'}}>
    <SolBirdGame
      lobbyId={lobbyId}
      playerId={playerId}
      username={username}
      wsUrl={wsUrl}
      entryAmount={parseFloat(entry)}
      players={parseInt(players)}
      matchKey={matchKey}
    />
  </div>
);
```

---

## Step 6: Add Graphics (Optional)

### Simple Graphics
```typescript
preload() {
  // Create colored rectangles
  this.add.graphics()
    .fillStyle(0x00ff00)
    .fillRect(0, 0, 50, 50)
    .generateTexture('player', 50, 50);
  
  this.add.graphics()
    .fillStyle(0xff0000)
    .fillRect(0, 0, 80, 400)
    .generateTexture('pipe', 80, 400);
}
```

### Or Load Images
```typescript
preload() {
  this.load.image('player', '/games/sol-bird/assets/player.png');
  this.load.image('pipe', '/games/sol-bird/assets/pipe.png');
  this.load.image('coin', '/games/sol-bird/assets/coin.png');
}
```

---

## Advantages Over Godot

1. **No export step** - Changes are instant
2. **Easy debugging** - Use browser DevTools
3. **TypeScript support** - Type safety
4. **Better integration** - Works with React/Next.js
5. **Smaller bundle** - Only includes what you need
6. **Easier to maintain** - All code in one place

---

## Next Steps

1. Install Phaser: `npm install phaser`
2. Create `SolBirdGame.tsx` component
3. Implement basic Flappy Bird mechanics
4. Integrate with existing `ws-glue.js`
5. Test with backend
6. Add polish (graphics, sounds, etc.)

**Estimated time:** 1-2 days for a working version

---

## Need Help?

I can:
1. Create the complete Phaser game code
2. Help with specific mechanics
3. Debug issues as they come up

Let me know if you want to go this route!

