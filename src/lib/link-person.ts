import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Links a freshly-authenticated Supabase auth user to their existing
 * `people` row, matched by email — set at registration (§7,
 * docs/ui-flows.md). People who registered have a row waiting; this just
 * attaches their login to it. Someone with no matching row hasn't
 * registered. Shared by both sign-in paths (link-click via
 * auth/callback, and the code-entry path in actions/auth.ts) — whichever
 * one actually establishes the session, this is the same next step
 * either way.
 */
export async function linkPersonToAuthUser(authUserId: string, email: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: alreadyLinked, error: lookupError } = await admin
    .from("people")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (lookupError) {
    console.error("linkPersonToAuthUser: already-linked lookup failed", lookupError);
  }
  if (alreadyLinked) return true;

  // Link by email, but only an unlinked record — never steal an existing
  // link from a different auth user.
  const { data: linked, error: linkError } = await admin
    .from("people")
    .update({ auth_user_id: authUserId })
    .eq("email", email)
    .is("auth_user_id", null)
    .select("id")
    .maybeSingle();
  if (linkError) {
    console.error("linkPersonToAuthUser: link update failed", linkError);
  }

  return !!linked;
}
