// Transactional email via Resend (docs/caps-rebuild-plan.md D7). Server
// only. Best-effort — callers should not fail their main operation if an
// email doesn't send, just log it.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Until the CAPS domain is verified in Resend, mail goes out from Resend's
// shared onboarding sender. Set RESEND_FROM once the domain is verified,
// e.g. "CAPS <noreply@capeanimalprotectionshelter.org.au>".
const FROM = process.env.RESEND_FROM ?? "CAPS <onboarding@resend.dev>";

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "email send failed" };
  }
}

/** Absolute base URL for links in emails. */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "capsapp-five.vercel.app";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}
