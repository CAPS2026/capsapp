"use server";

import { createClient } from "@/lib/supabase/server";
import { linkPersonToAuthUser } from "@/lib/link-person";

type Result = { ok: true } | { error: "not_registered" | "no_session" };

/**
 * The other half of the type-in-code sign-in path (src/app/login/page.tsx
 * calls supabase.auth.verifyOtp client-side first, which establishes the
 * session directly in the current tab — no redirect, no link, so
 * auth/callback never runs). This does the same "are they actually
 * registered" step that route does, just from a server action instead of
 * a route handler, since there's no redirect to hang it off here.
 */
export async function completeCodeSignIn(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "no_session" };

  const isRegistered = await linkPersonToAuthUser(user.id, user.email);
  if (!isRegistered) {
    await supabase.auth.signOut();
    return { error: "not_registered" };
  }
  return { ok: true };
}
