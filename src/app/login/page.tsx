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
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "error" | "not_registered">("idle");

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
      setCodeStatus(result.error === "not_registered" ? "not_registered" : "error");
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

        {status === "sent" ? (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-ink-muted">
              Check <strong>{email}</strong> for a 6-digit code and type it in below.
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
                  placeholder="123456"
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
          className="h-12 rounded-[var(--radius)] border border-line-cool font-semibold"
        >
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
