"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveCarers, startPlacement } from "@/lib/actions/dog-activity";
import { DateTimeField } from "@/components/dogs/datetime-field";

export type PlacementType = "yard" | "bed_rest" | "jail_break" | "foster";

const TYPE_LABEL: Record<PlacementType, string> = {
  yard: "Yard",
  bed_rest: "Bed Rest",
  jail_break: "Jail Break",
  foster: "Foster",
};

const YARD_OPTIONS = ["Yard 1", "Yard 2"];

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
  const [reason, setReason] = useState(type === "yard" ? YARD_OPTIONS[0] : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPersonId("");
      setDueBack("");
      setReason(type === "yard" ? YARD_OPTIONS[0] : "");
      setNotes("");
      if (type === "jail_break" || type === "foster") listActiveCarers(type).then(setCarers);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, type]);

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
        router.refresh();
        onClose();
      }
    });
  }

  const needsCarer = type === "jail_break" || type === "foster";
  const needsReason = type === "bed_rest";
  const needsYardPicker = type === "yard";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg">Start {TYPE_LABEL[type]}</h2>

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

        <label className="flex flex-col gap-1 text-sm">
          Due End
          <DateTimeField required value={dueBack} onChange={setDueBack} />
        </label>

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
