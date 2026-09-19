import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Server-only client using the service role key. Bypasses RLS.
 * Never import this into client components — it must only run in
 * route handlers, server actions, or server components.
 */
export function supabaseAdmin() {
  if (cached) return cached;
  cached = createClient<Database>(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
