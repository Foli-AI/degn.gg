/**
 * Client-side Supabase configuration
 * This file is safe to import in client components
 * DO NOT import admin client here - use @/lib/supabase/admin for server-side operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SAFE_ENV, validateClientEnv } from '@/lib/env';

let clientInstance: SupabaseClient | null = null;

/**
 * Get client-side Supabase instance (anon key only)
 * Safe to use in client components
 */
export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const validation = validateClientEnv();
  if (!validation.valid) {
    throw new Error(`Supabase client configuration invalid: ${validation.missing.join(', ')}`);
  }

  clientInstance = createClient(SAFE_ENV.SUPABASE_URL!, SAFE_ENV.SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  console.log('✅ Supabase client initialized');
  return clientInstance;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getSupabaseClient() instead
 */
export const supabase = getSupabaseClient();

/**
 * DO NOT USE - Admin client should only be used server-side
 * Use getAdminClient() from @/lib/supabase/admin in API routes
 * @deprecated
 */
export const supabaseAdmin = null;

// Client-side validation
if (typeof window !== 'undefined') {
  // Only validate on client-side
  validateClientEnv();
}
