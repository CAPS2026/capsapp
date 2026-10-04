"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveCarers, startPlacement } from "@/lib/actions/dog-activity";
import { DateTimeField, DaysAheadSelect, TimeOfDayField } from "@/components/dogs/datetime-field";
import { formatTime24 } from "@/lib/format";

export type PlacementType = "yard" | "bed_rest" | "jail_break" | "foster";

const TYPE_LABEL: Record<PlacementType, string> = {
  yard: "Yard",
  bed_rest: "Bed Rest",
  jail_break: "Jail Break",
  foster: "Foster",
};

export const YARD_OPTIONS = ["Yard 1", "Yard 2"];

// A countdown reads much better than picking an exact date+time for
// something that's almost always "a couple of hours from now" — Paul's
// feedback (2026-09-07). Since 2026-10-04 there's also an "at a specific
// time" mode (e.g. back by 14:00) for when the day is running late.
const YARD_DURATIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
  { label: "3 hr", minutes: 180 },
  { label: "4 hr", minutes: 240 },
];

/** Today at "HH:MM" (local), or null if not set. */
function todayAt(hhmm: string): Date | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// Controlled — opened from ActionMenu with a fixed type, one focused form
// per action (Start Yard / Start Bed Rest / Start Jail Break / Start
// Foster) rather than a form that also asks you to pick the type.
export function StartPlacementDialog({
  dogId,
  type,
  isOpen,
  onClose,
}: {
  dogId: string;
  type: PlacementType;
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [carers, setCarers] = useState<{ id: string; name: string }[]>([]);
  const [personId, setPersonId] = useState("");
  const [dueBack, setDueBack] = useState("");
  const [yard, setYard] = useState(YARD_OPTIONS[0]);
  const [yardMode, setYardMode] = useState<"in" | "at">("in");
  const [yardMinutes, setYardMinutes] = useState<number | null>(null);
  const [yardAt, setYardAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPersonId("");
      setDueBack("");
      setYard(YARD_OPTIONS[0]);
      setYardMode("in");
      setYardMinutes(null);
      setYardAt("");
      setNotes("");
      if (type === "jail_break" || type === "foster") listActiveCarers(type).then(setCarers);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, type]);

  /** The due-back instant for the current form state, or an error message. */
  function resolveDueBack(): { iso: string } | { error: string } {
    if (type === "yard") {
      if (yardMode === "in") {
        if (yardMinutes === null) return { error: "Pick how long, or switch to a specific time." };
        return { iso: new Date(Date.now() + yardMinutes * 60_000).toISOString() };
      }
      const at = todayAt(yardAt);
      if (!at) return { error: "Pick the time they're due back." };
      if (at <= new Date()) return { error: "That time has already passed today." };
      return { iso: at.toISOString() };
    }
    if (!dueBack) return { error: "Pick a Due End date and time." };
    return { iso: new Date(dueBack).toISOString() };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const due = resolveDueBack();
    if ("error" in due) return setError(due.error);
    startTransition(async () => {
      const result = await startPlacement({
        dogId,
        type,
        personId: personId || undefined,
        dueBack: due.iso,
        reason: type === "yard" ? yard : type === "bed_rest" ? notes : undefined,
        notes: type === "jail_break" || type === "foster" ? notes : undefined,
      });
      if (result.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  const needsCarer = type === "jail_break" || type === "foster";
  const isYard = type === "yard";
  const yardPreview =
    yardMode === "in"
      ? yardMinutes !== null
        ? formatTime24(new Date(Date.now() + yardMinutes * 60_000).toISOString())
        : null
      : todayAt(yardAt)
        ? formatTime24(todayAt(yardAt)!.toISOString())
        : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg">Start {TYPE_LABEL[type]}</h2>

        {isYard && (
          <label className="flex flex-col gap-1 text-sm">
            Which yard
            <select
              value={yard}
              onChange={(e) => setYard(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              {YARD_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}

        {needsCarer && (
          <label className="flex flex-col gap-1 text-sm">
            Carer
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              <option value="" disabled>
                Choose a carer…
              </option>
              {carers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {carers.length === 0 && (
              <span className="text-xs text-ink-muted">No active carers of this type found.</span>
            )}
          </label>
        )}

        {isYard ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2">
              {(["in", "at"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setYardMode(m)}
                  className={`h-9 px-3 rounded-full text-sm font-semibold border ${
                    yardMode === m ? "bg-brand text-white border-brand" : "border-line-cool bg-white text-ink"
                  }`}
                >
                  {m === "in" ? "Due back in…" : "Due back at…"}
                </button>
              ))}
            </div>
            {yardMode === "in" ? (
              <div className="grid grid-cols-3 gap-2">
                {YARD_DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    type="button"
                    onClick={() => setYardMinutes(d.minutes)}
                    className={`h-11 rounded-[var(--radius)] border text-sm font-semibold ${
                      yardMinutes === d.minutes ? "bg-brand text-white border-brand" : "border-line-cool bg-white text-ink"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            ) : (
              <TimeOfDayField value={yardAt} onChange={setYardAt} />
            )}
            {yardPreview && <span className="text-xs text-ink">Back by {yardPreview}</span>}
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <span>Due End</span>
            <DateTimeField required value={dueBack} onChange={setDueBack} />
            <DaysAheadSelect value={dueBack} onChange={setDueBack} />
          </div>
        )}

        {type === "bed_rest" && (
          <label className="flex flex-col gap-1 text-sm">
            Notes
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            />
          </label>
        )}

        {needsCarer && (
          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white"
            />
          </label>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
          >
            {isPending ? "Saving…" : `Start ${TYPE_LABEL[type]}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
