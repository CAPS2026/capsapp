"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveCarers, startPlacement } from "@/lib/actions/dog-activity";

type PlacementType = "yard" | "bed_rest" | "jail_break" | "foster";

const SUBMIT_LABEL: Record<PlacementType, string> = {
  yard: "Start Yard",
  bed_rest: "Start Bed Rest",
  jail_break: "Start Jail Break",
  foster: "Start Foster",
};

const YARD_OPTIONS = ["Yard 1", "Yard 2"];

// Staff-only: covers the activity types the one-tap Start Walk fast path
// doesn't (docs/ui-flows.md §4 full path). RLS only allows non-walk inserts
// for staff, so a volunteer never sees this trigger.
export function StartPlacementDialog({ dogId }: { dogId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<PlacementType>("yard");
  const [carers, setCarers] = useState<{ id: string; name: string }[]>([]);
  const [personId, setPersonId] = useState("");
  const [dueBack, setDueBack] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setError(null);
    setType("yard");
    setCarers([]);
    setPersonId("");
    setDueBack("");
    setReason(YARD_OPTIONS[0]);
    setNotes("");
  }

  function open() {
    reset();
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onTypeChange(next: PlacementType) {
    setType(next);
    setPersonId("");
    setReason(next === "yard" ? YARD_OPTIONS[0] : "");
    if (next === "jail_break" || next === "foster") {
      listActiveCarers(next).then(setCarers);
    } else {
      setCarers([]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startPlacement({
        dogId,
        type,
        personId: personId || undefined,
        dueBack: dueBack ? new Date(dueBack).toISOString() : undefined,
        reason: reason || undefined,
        notes: notes || undefined,
      });
      if (result.error) setError(result.error);
      else {
        close();
        router.refresh();
      }
    });
  }

  const needsCarer = type === "jail_break" || type === "foster";
  // Every type in this dialog gets a due-back now — Paul's ask, so an
  // overdue flag can show for Yard too (a caretaker alarm to bring them in).
  const needsDueBack = true;
  const needsReason = type === "bed_rest";
  const needsYardPicker = type === "yard";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open();
        }}
        className="text-xs text-ink-muted underline underline-offset-2"
      >
        Other…
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold text-lg">Start — other than a walk</h2>

          <label className="flex flex-col gap-1 text-sm">
            Type
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as PlacementType)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              <option value="yard">Yard</option>
              <option value="bed_rest">Bed Rest</option>
              <option value="jail_break">Jail Break</option>
              <option value="foster">Foster</option>
            </select>
          </label>

          {needsYardPicker && (
            <label className="flex flex-col gap-1 text-sm">
              Which yard
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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

          {needsDueBack && (
            <label className="flex flex-col gap-1 text-sm">
              Expected end
              <input
                type="datetime-local"
                required
                value={dueBack}
                onChange={(e) => setDueBack(e.target.value)}
                className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
              />
            </label>
          )}

          {needsReason && (
            <label className="flex flex-col gap-1 text-sm">
              Reason
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
            <button type="button" onClick={close} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {isPending ? "Saving…" : SUBMIT_LABEL[type]}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
