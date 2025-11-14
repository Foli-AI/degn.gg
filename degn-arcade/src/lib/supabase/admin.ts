import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Get Supabase Admin client with service role key
 * This function can ONLY be used in server-side code (API routes, server actions)
 * Never call this from client components
 */
export function getAdminClient(): SupabaseClient {
  // Runtime check to ensure this is only called server-side
  if (typeof window !== 'undefined') {
    throw new Error('getAdminClient() can only be called server-side. Use getSupabaseClient() for client-side operations.');
  }
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing");
    throw new Error("Supabase URL is required for admin client");
  }

  if (!serviceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing");
    console.error("🔑 Available env keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error("Supabase Service Role Key is required for admin operations");
  }

  try {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("✅ Supabase Admin client initialized successfully");
    return adminClient;
  } catch (error) {
    console.error("❌ Supabase Admin failed:", error);
    throw new Error("Failed to initialize Supabase admin client");
  }
}

/**
 * Check if admin client can be initialized (without throwing)
 * Useful for conditional admin operations
 */
export function canUseAdmin(): boolean {
  // Runtime check to ensure this is only called server-side
  if (typeof window !== 'undefined') {
    return false;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return !!(supabaseUrl && serviceRoleKey);
}

/**
 * Reset admin client (useful for testing)
 */
export function resetAdminClient(): void {
  // Runtime check to ensure this is only called server-side
  if (typeof window !== 'undefined') {
    console.warn('resetAdminClient() should only be called server-side');
    return;
  }
  adminClient = null;
}
