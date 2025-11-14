/**
 * Environment variable validation and safe access
 * Separates client-safe and server-only environment variables
 */

// Client-safe environment variables (can be exposed to browser)
export const SAFE_ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
  SOLANA_RPC: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_MATCHMAKER_URL || 'http://localhost:3001',
  MATCHMAKER_URL: process.env.NEXT_PUBLIC_MATCHMAKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
} as const;

// Server-only environment variables (NEVER expose to client)
export const PRIVATE_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ESCROW_PRIVATE_KEY: process.env.ESCROW_PRIVATE_KEY,
  MATCHMAKER_SECRET: process.env.MATCHMAKER_SECRET,
} as const;

/**
 * Validate client-safe environment variables
 */
export function validateClientEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!SAFE_ENV.SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SAFE_ENV.SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  const valid = missing.length === 0;
  
  if (!valid) {
    console.error("❌ Missing required client environment variables:", missing);
    console.log("🔑 Loaded env keys:", Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
  } else {
    console.log("✅ Client environment variables validated");
  }
  
  return { valid, missing };
}

/**
 * Validate server-only environment variables
 * Only call this from server-side code
 */
export function validateServerEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Critical server env vars
  if (!PRIVATE_ENV.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  
  // Optional server env vars
  if (!PRIVATE_ENV.ESCROW_PRIVATE_KEY) {
    warnings.push('ESCROW_PRIVATE_KEY not set - using temporary keypair');
  }
  
  if (!PRIVATE_ENV.MATCHMAKER_SECRET) {
    warnings.push('MATCHMAKER_SECRET not set - using default');
  }
  
  const valid = missing.length === 0;
  
  if (!valid) {
    console.error("❌ Missing critical server environment variables:", missing);
  } else {
    console.log("✅ Server environment variables validated");
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
  }
  
  return { valid, missing, warnings };
}

/**
 * Get environment file info for debugging
 */
export function getEnvInfo(): { 
  nodeEnv: string; 
  hasEnvLocal: boolean; 
  supabaseKeysFound: string[];
  loadedFrom: string;
} {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const supabaseKeysFound = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
  
  // Try to detect which env file was loaded
  let loadedFrom = 'unknown';
  if (typeof window === 'undefined') {
    // Server-side detection
    try {
      const fs = require('fs');
      const path = require('path');
      const envLocalPath = path.join(process.cwd(), '.env.local');
      const hasEnvLocal = fs.existsSync(envLocalPath);
      loadedFrom = hasEnvLocal ? '.env.local' : '.env or system';
      
      return {
        nodeEnv,
        hasEnvLocal,
        supabaseKeysFound,
        loadedFrom
      };
    } catch {
      // Fallback if fs is not available
    }
  }
  
  return {
    nodeEnv,
    hasEnvLocal: false,
    supabaseKeysFound,
    loadedFrom
  };
}

/**
 * Print environment debug info (server-side only)
 */
export function printEnvDebug(): void {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ printEnvDebug should only be called server-side');
    return;
  }
  
  const info = getEnvInfo();
  console.log('🔍 Environment Debug Info:');
  console.log(`  NODE_ENV: ${info.nodeEnv}`);
  console.log(`  Loaded from: ${info.loadedFrom}`);
  console.log(`  Has .env.local: ${info.hasEnvLocal}`);
  console.log(`  Supabase keys found: ${info.supabaseKeysFound.join(', ')}`);
  
  const clientValidation = validateClientEnv();
  const serverValidation = validateServerEnv();
  
  console.log(`  Client env valid: ${clientValidation.valid}`);
  console.log(`  Server env valid: ${serverValidation.valid}`);
}
