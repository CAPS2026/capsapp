import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Handles the redirect from a magic-link email or an OAuth provider.
 * Exchanges the code for a session, then links the new auth user to their
 * existing `people` row (matched by email — set at registration, §7 in
 * docs/ui-flows.md). People who registered have a row waiting; this just
 * attaches their login to it. Someone signing in with no matching `people`
 * row hasn't registered — sent to /login with an explanatory message rather
 * than silently given a roleless account.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dogs";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      await linkPersonToAuthUser(data.user.id, data.user.email);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

async function linkPersonToAuthUser(authUserId: string, email: string) {
  const admin = createAdminClient();

  const { data: alreadyLinked } = await admin
    .from("people")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (alreadyLinked) return;

  // Link by email, but only an unlinked record — never steal an existing
  // link from a different auth user.
  await admin
    .from("people")
    .update({ auth_user_id: authUserId })
    .eq("email", email)
    .is("auth_user_id", null);
}
