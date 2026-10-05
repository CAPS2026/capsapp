"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { completeCodeSignIn } from "@/lib/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") ?? "/dogs";
  // Supabase env vars aren't wired into this environment yet (see
  // docs/setup-handover.md §2) — don't crash the page over it.
  const supabaseReady =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => (supabaseReady ? createClient() : null), [supabaseReady]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "not_registered">("idle");
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "error" | "not_registered" | "no_access">("idle");

  const callbackError = searchParams.get("error");

  // Email-only, no link — a clickable magic link depends on this browser
  // still holding the PKCE code verifier it stashed when the email was
  // requested, which breaks the moment the link opens somewhere else
  // (another device, or an email app's own in-app browser with a separate
  // cookie jar). Google Workspace mail hit this repeatedly, so the email
  // template only sends a 6-digit code now — no ConfirmationURL at all.
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return setStatus("error");
    setStatus("sending");
    // shouldCreateUser: false — a code only works for someone CAPS has
    // already registered. Without this, Supabase silently creates a working
    // login for any email typed in, which makes "register" meaningless.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (!error) setStatus("sent");
    else if (/signup|not allowed/i.test(error.message)) setStatus("not_registered");
    else setStatus("error");
  }

  // verifyOtp runs right here in this same tab — no redirect, no link, so
  // none of the cross-browser/device breakage above can happen.
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setCodeStatus("checking");
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setCodeStatus("error");
      return;
    }
    const result = await completeCodeSignIn();
    if ("error" in result) {
      setCodeStatus(result.error === "not_registered" || result.error === "no_access" ? result.error : "error");
      return;
    }
    router.push(next);
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
      <Image src="/logo.jpg" alt="CAPS" width={96} height={96} className="rounded-full" priority />

      <div className="w-full max-w-sm bg-card border border-line rounded-[var(--radius)] p-6 flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-center" style={{ fontFamily: "var(--font-display)" }}>
          Sign in to CAPS App
        </h1>

        {!supabaseReady && (
          <p className="text-xs text-warm-ink bg-warm-tint rounded-[var(--radius)] p-2 text-center">
            Not connected yet — sign-in is disabled until the app&apos;s
            Supabase keys are set.
          </p>
        )}

        {callbackError === "not_registered" && status === "idle" && (
          <p className="text-sm text-danger text-center">
            No CAPS account found for that sign-in. Ask a staff member — new
            volunteers register at the shelter.
          </p>
        )}

        {callbackError === "no_access" && status === "idle" && (
          <p className="text-sm text-danger text-center">
            Signing in to the app is for staff, committee and Volunteer + only. Volunteers are checked in by a caretaker — no sign-in needed.
          </p>
        )}

        {status === "sent" ? (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-ink-muted">
              Check <strong>{email}</strong> for a sign-in code and type it in below.
            </p>
            <form onSubmit={verifyCode} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  placeholder="Sign-in code"
                  className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base text-center tracking-widest"
                />
              </label>
              <button
                type="submit"
                disabled={codeStatus === "checking"}
                className="h-12 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
              >
                {codeStatus === "checking" ? "Checking…" : "Verify code"}
              </button>
              {codeStatus === "not_registered" && (
                <p className="text-sm text-danger">
                  No CAPS account found for that email. Ask a staff member — new volunteers
                  register at the shelter.
                </p>
              )}
              {codeStatus === "no_access" && (
                <p className="text-sm text-danger">
                  Signing in to the app is for staff, committee and Volunteer + only. Volunteers are checked in by a caretaker — no sign-in needed.
                </p>
              )}
              {codeStatus === "error" && (
                <p className="text-sm text-danger">
                  That code isn&apos;t right or has expired — check the email again, or send a new
                  one.
                </p>
              )}
            </form>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setCode("");
                setCodeStatus("idle");
              }}
              className="text-sm text-brand-ink font-semibold self-center"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendCode} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base"
              />
            </label>
            <button
              type="submit"
              disabled={status === "sending"}
              className="h-12 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Email me a code"}
            </button>
            {status === "not_registered" && (
              <p className="text-sm text-danger">
                No CAPS account found for that email. Ask a staff member — new
                volunteers register at the shelter.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-danger">
                Couldn&apos;t send that code — check the address and try again.
              </p>
            )}
          </form>
        )}

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-line" />
          or
          <div className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="h-12 rounded-[var(--radius)] border border-line-cool bg-white font-semibold flex items-center justify-center gap-3"
        >
          {/* Google's standard four-colour "G" */}
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>
      </div>

    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
