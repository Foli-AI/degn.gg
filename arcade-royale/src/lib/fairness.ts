import crypto from 'crypto';

/**
 * Provably Fair System for DEGN.gg Arcade
 * Generates deterministic seeds and PRNGs for fair match outcomes
 */

export interface FairnessConfig {
  serverSecret: string;
  roomId: string;
  timestamp: number;
}

/**
 * Generate a deterministic seed for a match
 * Uses HMAC-SHA256 with server secret, room ID, and timestamp
 */
export function generateSeed(config: FairnessConfig): string {
  const { serverSecret, roomId, timestamp } = config;
  const data = `${roomId}:${timestamp}`;
  return hmacSha256(serverSecret, data);
}

/**
 * HMAC-SHA256 hash function
 */
export function hmacSha256(key: string, data: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Convert seed to deterministic PRNG
 * Returns a seeded random number generator
 */
export function seedToPRNG(seed: string): () => number {
  let hash = seed;
  
  return function(): number {
    // Use SHA256 to generate next hash
    hash = crypto.createHash('sha256').update(hash).digest('hex');
    
    // Convert first 8 hex chars to number between 0 and 1
    const hexValue = hash.substring(0, 8);
    const intValue = parseInt(hexValue, 16);
    return intValue / 0xffffffff;
  };
}

/**
 * Seeded random integer between min and max (inclusive)
 */
export function seededRandomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Seeded random float between min and max
 */
export function seededRandomFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/**
 * Seeded random choice from array
 */
export function seededRandomChoice<T>(rng: () => number, array: T[]): T {
  const index = Math.floor(rng() * array.length);
  return array[index];
}

/**
 * Shuffle array using seeded random
 */
export function seededShuffle<T>(rng: () => number, array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Verify a seed was generated correctly
 */
export function verifySeed(
  seed: string, 
  serverSecret: string, 
  roomId: string, 
  timestamp: number
): boolean {
  const expectedSeed = generateSeed({ serverSecret, roomId, timestamp });
  return seed === expectedSeed;
}

/**
 * Generate client-side verification data
 */
export function generateVerificationData(
  serverSecret: string,
  roomId: string,
  timestamp: number
): {
  seed: string;
  serverSecretHash: string;
  roomId: string;
  timestamp: number;
} {
  const seed = generateSeed({ serverSecret, roomId, timestamp });
  const serverSecretHash = crypto.createHash('sha256').update(serverSecret).digest('hex');
  
  return {
    seed,
    serverSecretHash,
    roomId,
    timestamp
  };
}

/**
 * Client-side seed verification (without server secret)
 */
export function clientVerifySeed(
  seed: string,
  serverSecretHash: string,
  roomId: string,
  timestamp: number,
  revealedServerSecret: string
): boolean {
  // Verify server secret hash
  const expectedSecretHash = crypto.createHash('sha256').update(revealedServerSecret).digest('hex');
  if (expectedSecretHash !== serverSecretHash) {
    return false;
  }
  
  // Verify seed generation
  const expectedSeed = generateSeed({ 
    serverSecret: revealedServerSecret, 
    roomId, 
    timestamp 
  });
  
  return seed === expectedSeed;
}

/**
 * Default server secret (should be overridden in production)
 */
export const DEFAULT_SERVER_SECRET = process.env.SERVER_SECRET || 'default-server-secret-change-in-production';

/**
 * Generate a new server secret
 */
export function generateServerSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}


