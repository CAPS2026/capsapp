"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PART_LABEL, type ShiftPerson } from "@/lib/shift";
import { pickPerson } from "@/lib/actions/shift";

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

export function PersonPicker({ people }: { people: ShiftPerson[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(person: ShiftPerson) {
    setError(null);
    setBusyId(person.id);
    startTransition(async () => {
      const loc = await getLocation();
      const r = await pickPerson(person.id, person.part, loc?.lat ?? null, loc?.lng ?? null);
      setBusyId(null);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  const rostered = people.filter((p) => p.part);
  const others = people.filter((p) => !p.part);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <Image src="/logo.jpg" alt="" width={56} height={56} className="rounded-full" />
      <div>
        <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Who&rsquo;s working right now?
        </h1>
        <p className="mt-1.5 max-w-xs text-sm text-ink-muted">
          Shared tablet. Choose your name so today&rsquo;s checklist knows who&rsquo;s doing what.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid w-full max-w-sm grid-cols-1 gap-2.5">
        {rostered.map((p) => (
          <PersonCard key={p.id} person={p} busy={isPending && busyId === p.id} disabled={isPending} onPick={pick} />
        ))}
        {others.length > 0 && (
          <>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Not rostered today</p>
            {others.map((p) => (
              <PersonCard key={p.id} person={p} busy={isPending && busyId === p.id} disabled={isPending} onPick={pick} dimmed />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PersonCard({
  person,
  busy,
  disabled,
  dimmed,
  onPick,
}: {
  person: ShiftPerson;
  busy: boolean;
  disabled: boolean;
  dimmed?: boolean;
  onPick: (p: ShiftPerson) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(person)}
      className={`flex items-center gap-3 rounded-[var(--radius)] border p-3.5 text-left disabled:opacity-50 ${
        dimmed ? "border-line bg-gray-tint" : "border-line-cool bg-card"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-base font-extrabold text-white">
        {person.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{person.name}</span>
        <span className="block text-xs text-ink-muted">
          {person.part ? `${PART_LABEL[person.part]} shift` : "Tap if you're covering today"}
        </span>
      </span>
      {busy && <span className="text-xs font-bold text-brand-ink">…</span>}
    </button>
  );
}
