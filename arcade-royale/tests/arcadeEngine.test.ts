import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { simulateMatch, validateMatchResult } from '../src/lib/coinraidEngine';
import { generateSeed, seedToPRNG } from '../src/lib/fairness';
import type { Player } from '../src/lib/coinraidEngine';

describe('Arcade Engine Tests', () => {
  const mockPlayers: Player[] = [
    { id: 'player1', username: 'Alice', betAmount: 100 },
    { id: 'player2', username: 'Bob', betAmount: 150 },
    { id: 'player3', username: 'Charlie', betAmount: 200 },
    { id: 'player4', username: 'David', betAmount: 75 }
  ];

  describe('Fairness System', () => {
    it('should generate deterministic seeds', () => {
      const config = {
        serverSecret: 'test-secret',
        roomId: 'room-123',
        timestamp: 1640995200000
      };

      const seed1 = generateSeed(config);
      const seed2 = generateSeed(config);

      expect(seed1).toBe(seed2);
      expect(seed1).toHaveLength(64); // SHA256 hex string
    });

    it('should generate different seeds for different inputs', () => {
      const config1 = {
        serverSecret: 'test-secret',
        roomId: 'room-123',
        timestamp: 1640995200000
      };

      const config2 = {
        serverSecret: 'test-secret',
        roomId: 'room-456',
        timestamp: 1640995200000
      };

      const seed1 = generateSeed(config1);
      const seed2 = generateSeed(config2);

      expect(seed1).not.toBe(seed2);
    });

    it('should create deterministic PRNG from seed', () => {
      const seed = 'test-seed-123';
      const rng1 = seedToPRNG(seed);
      const rng2 = seedToPRNG(seed);

      const sequence1 = Array.from({ length: 10 }, () => rng1());
      const sequence2 = Array.from({ length: 10 }, () => rng2());

      expect(sequence1).toEqual(sequence2);
      
      // Ensure values are between 0 and 1
      sequence1.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      });
    });
  });

  describe('CoinRaid Game Engine', () => {
    it('should simulate a complete match deterministically', () => {
      const seed = 'deterministic-test-seed';
      
      const result1 = simulateMatch(mockPlayers, seed);
      const result2 = simulateMatch(mockPlayers, seed);

      expect(result1.winner).toBe(result2.winner);
      expect(result1.positions).toEqual(result2.positions);
      expect(result1.finalScores).toEqual(result2.finalScores);
      expect(result1.events.length).toBe(result2.events.length);
    });

    it('should produce different results with different seeds', () => {
      const seed1 = 'seed-one';
      const seed2 = 'seed-two';
      
      const result1 = simulateMatch(mockPlayers, seed1);
      const result2 = simulateMatch(mockPlayers, seed2);

      // Results should be different (very high probability)
      expect(result1.winner !== result2.winner || 
             JSON.stringify(result1.positions) !== JSON.stringify(result2.positions)).toBe(true);
    });

    it('should assign correct positions to all players', () => {
      const seed = 'position-test-seed';
      const result = simulateMatch(mockPlayers, seed);

      // Check that all players have positions
      expect(Object.keys(result.positions)).toHaveLength(mockPlayers.length);
      
      // Check that positions are 1, 2, 3, 4
      const positions = Object.values(result.positions).sort();
      expect(positions).toEqual([1, 2, 3, 4]);

      // Winner should have position 1
      expect(result.positions[result.winner]).toBe(1);
    });

    it('should generate valid game events', () => {
      const seed = 'events-test-seed';
      const result = simulateMatch(mockPlayers, seed);

      expect(result.events.length).toBeGreaterThan(0);
      
      // Check event structure
      result.events.forEach(event => {
        expect(event).toHaveProperty('tick');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('data');
        expect(typeof event.tick).toBe('number');
        expect(['spawn', 'hit', 'powerup', 'elimination', 'score']).toContain(event.type);
      });

      // Should have elimination events for all but winner
      const eliminationEvents = result.events.filter(e => e.type === 'elimination');
      expect(eliminationEvents.length).toBe(mockPlayers.length - 1);
    });

    it('should validate match results correctly', () => {
      const seed = 'validation-test-seed';
      const result = simulateMatch(mockPlayers, seed);

      // Valid result should pass validation
      expect(validateMatchResult(mockPlayers, result, seed)).toBe(true);

      // Modified result should fail validation
      const modifiedResult = {
        ...result,
        winner: 'fake-player-id'
      };
      expect(validateMatchResult(mockPlayers, modifiedResult, seed)).toBe(false);
    });

    it('should handle edge cases', () => {
      // Single player
      const singlePlayer: Player[] = [
        { id: 'solo', username: 'Solo', betAmount: 100 }
      ];
      
      const soloResult = simulateMatch(singlePlayer, 'solo-seed');
      expect(soloResult.winner).toBe('solo');
      expect(soloResult.positions['solo']).toBe(1);

      // Two players
      const twoPlayers: Player[] = [
        { id: 'p1', username: 'Player1', betAmount: 100 },
        { id: 'p2', username: 'Player2', betAmount: 100 }
      ];
      
      const duelResult = simulateMatch(twoPlayers, 'duel-seed');
      expect(Object.keys(duelResult.positions)).toHaveLength(2);
      expect(duelResult.positions[duelResult.winner]).toBe(1);
    });
  });

  describe('Match Statistics', () => {
    it('should calculate match statistics correctly', () => {
      const { calculateMatchStats } = require('../src/lib/coinraidEngine');
      const seed = 'stats-test-seed';
      const result = simulateMatch(mockPlayers, seed);
      
      const stats = calculateMatchStats(result);
      
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('eliminationRate');
      expect(stats).toHaveProperty('powerupCount');
      expect(stats).toHaveProperty('matchDuration');
      
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.totalEvents).toBe(result.events.length);
      expect(stats.eliminationRate).toBeGreaterThan(0);
      expect(stats.matchDuration).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should simulate matches within reasonable time', () => {
      const startTime = Date.now();
      
      // Run 10 simulations
      for (let i = 0; i < 10; i++) {
        simulateMatch(mockPlayers, `perf-test-${i}`);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 10 simulations in under 1 second
      expect(totalTime).toBeLessThan(1000);
    });

    it('should handle large player counts efficiently', () => {
      const largePlayers: Player[] = Array.from({ length: 20 }, (_, i) => ({
        id: `player-${i}`,
        username: `Player${i}`,
        betAmount: 100 + i * 10
      }));

      const startTime = Date.now();
      const result = simulateMatch(largePlayers, 'large-game-seed');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms
      expect(Object.keys(result.positions)).toHaveLength(20);
      expect(result.positions[result.winner]).toBe(1);
    });
  });

  describe('Randomness Distribution', () => {
    it('should distribute winners fairly across multiple games', () => {
      const winCounts: Record<string, number> = {};
      const numGames = 100;

      // Initialize win counts
      mockPlayers.forEach(player => {
        winCounts[player.id] = 0;
      });

      // Run multiple games with different seeds
      for (let i = 0; i < numGames; i++) {
        const result = simulateMatch(mockPlayers, `fairness-test-${i}`);
        winCounts[result.winner]++;
      }

      // Each player should win at least some games (allowing for randomness)
      // With 100 games and 4 players, expect roughly 25 wins each, but allow wide variance
      Object.values(winCounts).forEach(count => {
        expect(count).toBeGreaterThan(5); // At least 5% win rate
        expect(count).toBeLessThan(50); // At most 50% win rate
      });

      // Total wins should equal number of games
      const totalWins = Object.values(winCounts).reduce((sum, count) => sum + count, 0);
      expect(totalWins).toBe(numGames);
    });
  });
});

// Mock Supabase for integration tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}));

describe('Integration Tests', () => {
  // These would test the full arcade engine with mocked Supabase
  // For now, we'll skip these as they require more complex setup
  
  it.skip('should place bet atomically', async () => {
    // Test placeBet function with mocked Supabase
  });

  it.skip('should start match and distribute payouts', async () => {
    // Test startMatch function with mocked Supabase
  });
});


