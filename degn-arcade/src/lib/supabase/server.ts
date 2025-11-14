import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  // Runtime check - only throw at request time, not build time
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() can only be called server-side');
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
