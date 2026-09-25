"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordForgottenShift } from "@/lib/actions/shift";
import { PART_LABEL, firstName, parseYmd, shiftDay, type Part, type ShiftPerson } from "@/lib/shift";
import { PersonAvatar } from "@/components/shift/person-avatar";

const FIELD = "h-10 rounded-[var(--radius)] border border-line-cool bg-white px-3 text-sm font-normal";

/** "Forgot to sign in?": someone worked a shift without using the app (or a
 *  stand-in did it for them) and records it afterwards: who, which day and
 *  session, the times worked, and why the app wasn't used. It goes in the
 *  shift email marked "entered afterwards". */
export function ForgottenShiftForm({
  people,
  today,
  times,
  onClose,
}: {
  people: ShiftPerson[];
  today: string;
  times: Record<Part, { starts: string; ends: string }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [personId, setPersonId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [part, setPart] = useState<Part | null>(null);
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const days = [0, -1, -2].map((d) => shiftDay(today, d));
  const dayLabel = (d: string) =>
    d === today
      ? "Today"
      : d === shiftDay(today, -1)
        ? "Yesterday"
        : parseYmd(d).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

  function choosePart(p: Part) {
    setPart(p);
    setStarts(times[p].starts);
    setEnds(times[p].ends);
  }

  function submit() {
    if (!personId) {
      setError("Choose who worked the shift.");
      return;
    }
    if (!part) {
      setError("Choose morning or afternoon.");
      return;
    }
    if (!reason.trim()) {
      setError("Please say why the app wasn't used at the time.");
      return;
    }
    setError(null);
    const who = personId;
    const session = part;
    startTransition(async () => {
      const r = await recordForgottenShift({ personId: who, date, part: session, starts, ends, reason });
      if (r.error) setError(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const pill = (active: boolean) =>
    `h-10 rounded-[var(--radius)] border px-3 text-sm font-bold ${
      active ? "border-brand bg-brand-tint text-brand-ink" : "border-line bg-card text-foreground"
    }`;

  if (saved) {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line-cool bg-brand-tint p-3.5">
        <p className="m-0 text-sm font-extrabold text-foreground">Saved.</p>
        <p className="m-0 text-xs text-ink-muted">
          It is recorded as entered afterwards and goes in the shift email for that session (as an updated email if
          that one has already gone).
        </p>
        <button type="button" onClick={onClose} className="h-10 self-start rounded-[var(--radius)] bg-brand px-4 text-sm font-bold text-white">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-line-cool bg-brand-tint p-3.5">
      <p className="m-0 text-sm font-extrabold text-foreground">Record a shift you forgot to sign in for</p>

      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <button key={p.id} type="button" onClick={() => setPersonId(p.id)} className={`${pill(personId === p.id)} flex items-center gap-1.5`}>
            <PersonAvatar name={p.name} size={22} />
            {firstName(p.name)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <button key={d} type="button" onClick={() => setDate(d)} className={pill(date === d)}>
            {dayLabel(d)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["morning", "afternoon"] as Part[]).map((p) => (
          <button key={p} type="button" onClick={() => choosePart(p)} className={pill(part === p)}>
            {PART_LABEL[p]}
          </button>
        ))}
      </div>

      {part && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
            Started
            <input type="time" value={starts} onChange={(e) => setStarts(e.target.value)} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
            Finished
            <input type="time" value={ends} onChange={(e) => setEnds(e.target.value)} className={FIELD} />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
        Why wasn&rsquo;t the app used at the time? (required)
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal"
        />
      </label>

      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="h-10 flex-1 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius)] border border-line px-3 text-sm font-bold text-ink-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
