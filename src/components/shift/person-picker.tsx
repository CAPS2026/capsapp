"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PART_LABEL, firstName, timeRange, type Part, type ShiftPerson } from "@/lib/shift";
import { pickPerson } from "@/lib/actions/shift";
import { PersonAvatar } from "@/components/shift/person-avatar";

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

/** "Who's working right now?", the mockup's sign-in moment: one card per
 *  caretaker, tap yours. */
export function PersonPicker({ people }: { people: ShiftPerson[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Someone not on today's roster (covering a colleague, or helping out)
  // says which session they are covering; they are never marked late.
  const [covering, setCovering] = useState<ShiftPerson | null>(null);

  function pick(person: ShiftPerson) {
    if (!person.part) {
      setCovering(person);
      return;
    }
    signIn(person, person.part);
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
              {firstName(covering.name)}, which shift are you covering?
            </p>
            <p className="m-0 text-xs text-ink-muted">You aren&rsquo;t on today&rsquo;s roster, so you won&rsquo;t be marked late.</p>
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
      </div>
    </div>
  );
}
