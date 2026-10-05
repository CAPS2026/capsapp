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
/** Roles that may sign in to the app itself (Paul, 2026-10-05). General
 *  volunteers don't: they're checked in by a caretaker, so a sign-in would
 *  only ever show them a limited view they don't need. */
const SIGN_IN_ROLES = ["admin", "staff", "committee", "volunteer_plus"];

export type LinkResult = "ok" | "not_registered" | "no_access";

async function hasSignInRole(personId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("person_roles")
    .select("role")
    .eq("person_id", personId)
    .eq("status", "active")
    .in("role", SIGN_IN_ROLES);
  if (error) {
    console.error("hasSignInRole failed", error);
    return false; // fail closed
  }
  return (data ?? []).length > 0;
}

export async function linkPersonToAuthUser(authUserId: string, email: string): Promise<LinkResult> {
  const admin = createAdminClient();

  const { data: alreadyLinked, error: lookupError } = await admin
    .from("people")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (lookupError) {
    console.error("linkPersonToAuthUser: already-linked lookup failed", lookupError);
  }
  if (alreadyLinked) return (await hasSignInRole(alreadyLinked.id as string)) ? "ok" : "no_access";

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

  if (!linked) return "not_registered";
  return (await hasSignInRole(linked.id as string)) ? "ok" : "no_access";
}
