"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CAFE_COOKIE, UNLOCK_COOKIE } from "@/lib/cafe";
import { linkPersonToAuthUser } from "@/lib/link-person";

type Result = { ok: true } | { error: "not_registered" | "no_access" | "no_session" };

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

  const linked = await linkPersonToAuthUser(user.id, user.email);
  if (linked !== "ok") {
    await supabase.auth.signOut();
    return { error: linked };
  }
  // Proving who you are with an emailed code is stronger than the shared PIN,
  // so a fresh sign-in leaves volunteer mode on this device. This is the
  // way back in if the PIN is forgotten (Paul, 2026-10-04).
  const jar = await cookies();
  jar.delete(CAFE_COOKIE);
  jar.delete(UNLOCK_COOKIE);
  return { ok: true };
}
