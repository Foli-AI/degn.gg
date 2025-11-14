import { 
  seedToPRNG, 
  seededRandomInt, 
  seededRandomFloat, 
  seededRandomChoice,
  seededShuffle 
} from './fairness';

/**
 * CoinRaid Game Engine - Deterministic Simulation
 * Simulates space shooter matches using provably fair seeds
 */

export interface Player {
  id: string;
  username: string;
  betAmount: number;
  position?: number;
  eliminatedAt?: number;
  finalScore?: number;
}

export interface GameEvent {
  tick: number;
  type: 'spawn' | 'hit' | 'powerup' | 'elimination' | 'score';
  playerId?: string;
  data: any;
}

export interface MatchResult {
  winner: string;
  positions: Record<string, number>; // playerId -> final position
  events: GameEvent[];
  finalScores: Record<string, number>;
  duration: number; // in ticks
}

export interface SimulationConfig {
  maxTicks: number;
  asteroidSpawnRate: number;
  powerupSpawnRate: number;
  difficultyIncrease: number;
  eliminationThreshold: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  maxTicks: 3000, // ~2.5 minutes at 20 FPS
  asteroidSpawnRate: 0.02,
  powerupSpawnRate: 0.005,
  difficultyIncrease: 0.001,
  eliminationThreshold: 0.15 // 15% chance per tick when health low
};

/**
 * Player state during simulation
 */
interface PlayerState {
  id: string;
  health: number;
  score: number;
  powerups: string[];
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  eliminated: boolean;
  eliminatedAt?: number;
}

/**
 * Simulate a complete CoinRaid match deterministically
 */
export function simulateMatch(
  players: Player[],
  seed: string,
  config: SimulationConfig = DEFAULT_CONFIG
): MatchResult {
  const rng = seedToPRNG(seed);
  const events: GameEvent[] = [];
  const playerStates: Record<string, PlayerState> = {};
  
  // Initialize player states
  const shuffledPlayers = seededShuffle(rng, players);
  shuffledPlayers.forEach((player, index) => {
    playerStates[player.id] = {
      id: player.id,
      health: 100,
      score: 0,
      powerups: [],
      position: { 
        x: 100 + (index * 150), // Spread players across screen
        y: 400 
      },
      velocity: { x: 0, y: 0 },
      eliminated: false
    };
  });

  let activePlayers = shuffledPlayers.length;
  let currentDifficulty = 1.0;
  
  // Main simulation loop
  for (let tick = 0; tick < config.maxTicks && activePlayers > 1; tick++) {
    currentDifficulty += config.difficultyIncrease;
    
    // Spawn asteroids
    if (rng() < config.asteroidSpawnRate * currentDifficulty) {
      const targetPlayerId = seededRandomChoice(
        rng, 
        Object.keys(playerStates).filter(id => !playerStates[id].eliminated)
      );
      
      events.push({
        tick,
        type: 'spawn',
        playerId: targetPlayerId,
        data: { 
          type: 'asteroid',
          x: seededRandomInt(rng, 50, 750),
          y: 0,
          speed: seededRandomFloat(rng, 2, 5) * currentDifficulty
        }
      });
      
      // Simulate asteroid hit chance
      const hitChance = 0.1 + (currentDifficulty - 1) * 0.05;
      if (rng() < hitChance) {
        const damage = seededRandomInt(rng, 10, 25);
        playerStates[targetPlayerId].health -= damage;
        
        events.push({
          tick,
          type: 'hit',
          playerId: targetPlayerId,
          data: { damage, newHealth: playerStates[targetPlayerId].health }
        });
      }
    }
    
    // Spawn powerups
    if (rng() < config.powerupSpawnRate) {
      const luckyPlayerId = seededRandomChoice(
        rng,
        Object.keys(playerStates).filter(id => !playerStates[id].eliminated)
      );
      
      const powerupType = seededRandomChoice(rng, ['shield', 'multishot', 'speed']);
      playerStates[luckyPlayerId].powerups.push(powerupType);
      
      events.push({
        tick,
        type: 'powerup',
        playerId: luckyPlayerId,
        data: { type: powerupType }
      });
    }
    
    // Update scores and check eliminations
    Object.values(playerStates).forEach(player => {
      if (player.eliminated) return;
      
      // Base score increase
      player.score += 1;
      
      // Bonus score for powerups
      if (player.powerups.length > 0) {
        player.score += player.powerups.length * 2;
      }
      
      // Check for elimination
      if (player.health <= 0) {
        player.eliminated = true;
        player.eliminatedAt = tick;
        activePlayers--;
        
        events.push({
          tick,
          type: 'elimination',
          playerId: player.id,
          data: { 
            finalScore: player.score,
            cause: 'health_depleted'
          }
        });
      } else if (player.health < 30 && rng() < config.eliminationThreshold) {
        // Random elimination when health is low
        player.eliminated = true;
        player.eliminatedAt = tick;
        activePlayers--;
        
        events.push({
          tick,
          type: 'elimination',
          playerId: player.id,
          data: { 
            finalScore: player.score,
            cause: 'critical_damage'
          }
        });
      }
    });
    
    // Periodic score events for UI
    if (tick % 100 === 0) {
      Object.values(playerStates).forEach(player => {
        if (!player.eliminated) {
          events.push({
            tick,
            type: 'score',
            playerId: player.id,
            data: { score: player.score, health: player.health }
          });
        }
      });
    }
  }
  
  // Determine final positions
  const finalPlayers = Object.values(playerStates);
  
  // Sort by elimination time (later = better) and score
  finalPlayers.sort((a, b) => {
    if (a.eliminated && b.eliminated) {
      if (a.eliminatedAt !== b.eliminatedAt) {
        return (b.eliminatedAt || 0) - (a.eliminatedAt || 0);
      }
      return b.score - a.score;
    }
    if (a.eliminated) return 1;
    if (b.eliminated) return -1;
    return b.score - a.score;
  });
  
  // Assign positions
  const positions: Record<string, number> = {};
  const finalScores: Record<string, number> = {};
  
  finalPlayers.forEach((player, index) => {
    positions[player.id] = index + 1;
    finalScores[player.id] = player.score;
  });
  
  const winner = finalPlayers[0].id;
  const duration = Math.min(config.maxTicks, 
    Math.max(...Object.values(playerStates)
      .filter(p => p.eliminated)
      .map(p => p.eliminatedAt || 0)
    ) || config.maxTicks
  );
  
  return {
    winner,
    positions,
    events,
    finalScores,
    duration
  };
}

/**
 * Generate a compressed tick log for client animation
 * Reduces full event log to key frames for smooth animation
 */
export function generateTickLog(
  result: MatchResult,
  targetFPS: number = 20
): GameEvent[] {
  const { events, duration } = result;
  const tickInterval = Math.max(1, Math.floor(duration / (targetFPS * (duration / 1000))));
  
  const compressedEvents: GameEvent[] = [];
  const keyTicks = new Set<number>();
  
  // Always include elimination and powerup events
  events.forEach(event => {
    if (event.type === 'elimination' || event.type === 'powerup') {
      keyTicks.add(event.tick);
      compressedEvents.push(event);
    }
  });
  
  // Add score updates at regular intervals
  for (let tick = 0; tick < duration; tick += tickInterval) {
    keyTicks.add(tick);
  }
  
  // Add score events for key ticks
  events.forEach(event => {
    if (event.type === 'score' && keyTicks.has(event.tick)) {
      compressedEvents.push(event);
    }
  });
  
  return compressedEvents.sort((a, b) => a.tick - b.tick);
}

/**
 * Calculate match statistics for analysis
 */
export function calculateMatchStats(result: MatchResult): {
  averageScore: number;
  totalEvents: number;
  eliminationRate: number;
  powerupCount: number;
  matchDuration: number;
} {
  const scores = Object.values(result.finalScores);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  const eliminationEvents = result.events.filter(e => e.type === 'elimination');
  const powerupEvents = result.events.filter(e => e.type === 'powerup');
  
  return {
    averageScore,
    totalEvents: result.events.length,
    eliminationRate: eliminationEvents.length / scores.length,
    powerupCount: powerupEvents.length,
    matchDuration: result.duration
  };
}

/**
 * Validate match result integrity
 */
export function validateMatchResult(
  players: Player[],
  result: MatchResult,
  seed: string
): boolean {
  try {
    // Re-simulate with same seed
    const reSimulated = simulateMatch(players, seed);
    
    // Compare key results
    return (
      reSimulated.winner === result.winner &&
      JSON.stringify(reSimulated.positions) === JSON.stringify(result.positions) &&
      reSimulated.events.length === result.events.length
    );
  } catch (error) {
    console.error('Match validation failed:', error);
    return false;
  }
}


