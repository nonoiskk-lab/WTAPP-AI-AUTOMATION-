import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Server component / route handler client, scoped to the signed-in admin's
 * session cookie. Respects RLS as that admin — use this for all dashboard
 * reads/writes, not `supabaseAdmin()`.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no writable cookies — the
          // middleware refresh path handles session persistence instead.
        }
      },
    },
  });
}
