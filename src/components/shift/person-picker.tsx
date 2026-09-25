"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PART_LABEL, firstName, partForTime, timeRange, type Part, type ShiftPerson } from "@/lib/shift";
import { pickPerson } from "@/lib/actions/shift";
import { PersonAvatar } from "@/components/shift/person-avatar";
import { ForgottenShiftForm } from "@/components/shift/forgotten-shift-form";

/** Best-effort location: resolves to null (never rejects) if the browser
 *  has no geolocation, permission is denied, or it just times out, a
 *  sign-in should never be blocked by this. */
function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 },
    );
  });
}

/** How often the sign-in screen refreshes itself while it sits open, so a
 *  screen left up since the morning never shows the morning's roster in the
 *  afternoon. */
const REFRESH_MS = 5 * 60000;

/** "Who's working right now?", the mockup's sign-in moment: one card per
 *  caretaker, tap yours. */
export function PersonPicker({
  people,
  today,
  times,
}: {
  people: ShiftPerson[];
  today: string;
  times: Record<Part, { starts: string; ends: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Someone whose roster doesn't match the time right now (covering a
  // colleague, helping out, or rostered for the other session) says which
  // session they are working. Unrostered for it means never marked late.
  const [covering, setCovering] = useState<ShiftPerson | null>(null);

  // Keep the screen current while it's left open, but never while someone
  // is part-way through choosing or filling something in.
  const idle = !isPending && !covering && !forgotOpen;
  useEffect(() => {
    if (!idle) return;
    const t = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(t);
  }, [idle, router]);

  // Decided at the moment of the tap, from the clock now, not from when the
  // screen was loaded: rostered for the session it is now, sign straight in
  // to that; otherwise ask which one.
  function pick(person: ShiftPerson) {
    const nowPart = partForTime();
    if (person.sessions.some((s) => s.part === nowPart)) {
      signIn(person, nowPart);
      return;
    }
    setCovering(person);
  }

  function signIn(person: ShiftPerson, part: Part) {
    setError(null);
    setCovering(null);
    setBusyId(person.id);
    startTransition(async () => {
      const loc = await getLocation();
      const r = await pickPerson(person.id, part, loc?.lat ?? null, loc?.lng ?? null);
      setBusyId(null);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  // Two people sharing a first name (unlikely on a team this size) get
  // their full names so the cards can't be mixed up.
  const firstNames = people.map((p) => firstName(p.name));
  const label = (p: ShiftPerson) =>
    firstNames.filter((f) => f === firstName(p.name)).length > 1 ? p.name : firstName(p.name);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-[560px] flex-col gap-3.5 rounded-[14px] border border-line bg-card p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
        <Image src="/logo.jpg" alt="" width={48} height={48} className="mx-auto rounded-full" />
        <h1 className="m-0 text-center text-lg font-extrabold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Click your name to start your shift
        </h1>

        {error && <p className="m-0 text-center text-sm text-danger">{error}</p>}

        {people.length === 0 ? (
          <p className="m-0 text-center text-sm text-ink-muted">
            No caretakers are set up yet. An admin can add them from the Roster tab.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isPending}
                onClick={() => pick(p)}
                className={`flex min-w-[120px] flex-1 flex-col items-center gap-1.5 rounded-[var(--radius)] border-[1.5px] bg-card px-1.5 pb-3 pt-3.5 disabled:cursor-wait ${
                  busyId === p.id ? "border-brand bg-brand-tint" : "border-line"
                } ${p.part ? "" : "opacity-[0.55]"}`}
              >
                <PersonAvatar name={p.name} size={34} />
                <span className="text-xs font-extrabold text-foreground">{label(p)}</span>
                <span className="text-[9.5px] font-bold text-ink-muted">
                  {busyId === p.id
                    ? "Signing in…"
                    : p.part && p.starts && p.ends
                      ? `${PART_LABEL[p.part]} · ${timeRange(p.starts, p.ends)}`
                      : "Not rostered today"}
                </span>
              </button>
            ))}
          </div>
        )}

        {covering && (
          <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line-cool bg-brand-tint p-3.5">
            <p className="m-0 text-sm font-extrabold text-foreground">
              {firstName(covering.name)}, which shift are you working now?
            </p>
            <p className="m-0 text-xs text-ink-muted">
              {covering.sessions.length
                ? `You're rostered for the ${covering.sessions
                    .map((s) => `${PART_LABEL[s.part].toLowerCase()} (${timeRange(s.starts, s.ends)})`)
                    .join(" and ")} today. Covering the other shift, you won't be marked late.`
                : "You aren’t on today’s roster, so you won’t be marked late."}
            </p>
            <div className="flex gap-2">
              {(["morning", "afternoon"] as Part[]).map((part) => (
                <button
                  key={part}
                  type="button"
                  disabled={isPending}
                  onClick={() => signIn(covering, part)}
                  className="h-10 flex-1 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
                >
                  {PART_LABEL[part]}
                  {covering.sessions.some((s) => s.part === part) ? " (rostered)" : ""}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCovering(null)}
                className="h-10 rounded-[var(--radius)] border border-line px-3 text-sm font-bold text-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {people.length > 0 &&
          (forgotOpen ? (
            <ForgottenShiftForm people={people} today={today} times={times} onClose={() => setForgotOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => {
                setCovering(null);
                setForgotOpen(true);
              }}
              className="self-center text-xs font-bold text-brand-ink"
            >
              Forgot to sign in for an earlier shift?
            </button>
          ))}
      </div>
    </div>
  );
}
