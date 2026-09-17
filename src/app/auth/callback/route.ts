import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkPersonToAuthUser } from "@/lib/link-person";

/**
 * Handles the redirect from a magic-link email or an OAuth provider.
 * Exchanges the code for a session, then links the new auth user to their
 * existing `people` row (matched by email — set at registration, §7 in
 * docs/ui-flows.md). People who registered have a row waiting; this just
 * attaches their login to it. Someone signing in with no matching `people`
 * row hasn't registered — sent to /login with an explanatory message rather
 * than silently given a roleless account.
 *
 * Not used by the type-in-code path (src/lib/actions/auth.ts) — that
 * establishes the session client-side via verifyOtp and never redirects
 * through here, which is the whole point (no link, no PKCE code-verifier
 * cookie to lose across a different browser/device/in-app webview).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dogs";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      const isRegistered = await linkPersonToAuthUser(data.user.id, data.user.email);

      if (!isRegistered) {
        // Google sign-in has no pre-check like magic link's shouldCreateUser
        // (that only applies to OTP) — this is where an unregistered Google
        // sign-in gets caught. Sign the session back out rather than leave
        // them authenticated with nothing behind it.
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_registered`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("auth/callback: exchangeCodeForSession failed", error);
  } else {
    console.error("auth/callback: no code in query params", request.url);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
