import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { HEALTH_LINK_DAYS, healthLinkExpired } from "@/lib/health-link";
import { PART_LABEL, parseYmd, type Part } from "@/lib/shift";
import { HealthLinkButton } from "@/components/shift/health-link-button";
import { PhotoThumbs } from "@/components/shift/photo-thumbs";
import { signPhotoPaths } from "@/lib/shift-photos";

// Public landing page for the link in the health concern email (the
// /approve prefix is already open to people who aren't logged in). Opening
// the page changes nothing: a concern is only marked as dealt with when
// someone presses the button, so a mail scanner pre-fetching the link
// can't change anything.
export default async function HealthConcernLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const valid = /^[0-9a-f-]{36}$/i.test(token);
  const { data } = valid
    ? await admin
        .from("health_concern")
        .select(
          "dog_name, urgent, body, date, part, created_at, resolved_at, resolved_by_name, resolved_note, photo_paths, " +
            "person:people!health_concern_person_id_fkey(first_name, surname)",
        )
        .eq("token", token)
        .maybeSingle()
    : { data: null };
  const c = data as unknown as {
    dog_name: string | null;
    urgent: boolean;
    body: string;
    date: string;
    part: Part;
    created_at: string;
    resolved_at: string | null;
    resolved_by_name: string | null;
    resolved_note: string | null;
    photo_paths: string[] | null;
    person: { first_name: string; surname: string } | null;
  } | null;
  const signed = await signPhotoPaths(c?.photo_paths ?? [], 3600);
  const photoUrls = (c?.photo_paths ?? []).map((p) => signed.get(p)).filter((u): u is string => !!u);

  const day = c ? parseYmd(c.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }) : "";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <Image src="/logo.jpg" alt="CAPS" width={64} height={64} className="rounded-full" priority />
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[var(--radius)] border border-line bg-card p-6">
        {!c ? (
          <p className="m-0 text-center text-sm text-ink-muted">This health concern link isn&apos;t valid.</p>
        ) : (
          <>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-ink-muted">Health concern</p>
              <h1 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {c.urgent && <span className="mr-1 text-danger">URGENT</span>}
                {c.dog_name ?? "Dog not named"}
              </h1>
            </div>
            <div className="m-0 flex flex-col gap-1 border-t border-line pt-3 text-sm">
              <p className="m-0">
                <b>Raised by:</b> {c.person ? `${c.person.first_name} ${c.person.surname}`.trim() : "Unknown"}
              </p>
              <p className="m-0">
                <b>When:</b> {day}, {PART_LABEL[c.part].toLowerCase()} shift
              </p>
              <p className="m-0 whitespace-pre-wrap">{c.body}</p>
              <PhotoThumbs urls={photoUrls} />
            </div>
            {c.resolved_at ? (
              <p className="m-0 text-sm font-semibold text-ok">
                Already dealt with{c.resolved_by_name ? ` by ${c.resolved_by_name}` : ""},{" "}
                {new Date(c.resolved_at).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short" })}
                {c.resolved_note ? `: ${c.resolved_note}` : ""}
              </p>
            ) : healthLinkExpired(c.created_at) ? (
              <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
                This link has expired (links work for {HEALTH_LINK_DAYS} days). Please mark it as dealt with on the
                Handover log tab in the staff app.
              </p>
            ) : (
              <HealthLinkButton token={token} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
