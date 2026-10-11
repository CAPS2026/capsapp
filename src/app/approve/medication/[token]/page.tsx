import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSE_LINK_DAYS, courseLinkExpired } from "@/lib/medication-link";
import { CourseStopButton } from "@/components/shift/course-stop-button";

// Public landing page for the link in the "course finished?" email (the
// /approve prefix is already open to people who aren't logged in). Opening
// the page changes nothing: the medication is only stopped when someone
// presses the button, so a mail scanner pre-fetching the link can't stop it.
export default async function CourseFinishedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const valid = /^[0-9a-f-]{36}$/i.test(token);
  const { data } = valid
    ? await admin
        .from("medication")
        .select("dog_name, medicine, how_given, stopped_at, finish_flagged_at, finish_flagged_by, finish_note")
        .eq("token", token)
        .maybeSingle()
    : { data: null };
  const m = data as {
    dog_name: string;
    medicine: string;
    how_given: string | null;
    stopped_at: string | null;
    finish_flagged_at: string | null;
    finish_flagged_by: string | null;
    finish_note: string | null;
  } | null;
  const usable = m !== null && m.finish_flagged_at !== null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <Image src="/logo.jpg" alt="CAPS" width={64} height={64} className="rounded-full" priority />
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[var(--radius)] border border-line bg-card p-6">
        {!usable || !m ? (
          <p className="m-0 text-center text-sm text-ink-muted">This medication link isn&apos;t valid.</p>
        ) : (
          <>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-ink-muted">Course finished?</p>
              <h1 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {m.dog_name}
              </h1>
            </div>
            <div className="m-0 flex flex-col gap-1 border-t border-line pt-3 text-sm">
              <p className="m-0">
                <b>Medication:</b> {m.medicine}
                {m.how_given ? `, ${m.how_given}` : ""}
              </p>
              <p className="m-0">
                <b>Flagged by:</b> {m.finish_flagged_by ?? "a caretaker"}
              </p>
              {m.finish_note && (
                <p className="m-0">
                  <b>Note:</b> {m.finish_note}
                </p>
              )}
            </div>
            {m.stopped_at ? (
              <p className="m-0 text-sm font-semibold text-ok">This medication has already been stopped.</p>
            ) : courseLinkExpired(m.finish_flagged_at as string) ? (
              <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
                This link has expired (links work for {COURSE_LINK_DAYS} days). Please stop it on the Medications page
                in the staff app.
              </p>
            ) : (
              <CourseStopButton token={token} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
