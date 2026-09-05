import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * SERVER-ONLY. Never import this from a Client Component, never send
 * SUPABASE_SERVICE_ROLE_KEY to the browser. Used only for the handful of
 * privileged operations that genuinely need it: linking a new auth user to
 * their existing `people` row (§ auth/callback), the public registration
 * intake API, and the scheduled overdue-alerts job.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
