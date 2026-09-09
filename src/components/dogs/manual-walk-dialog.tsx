"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveVolunteers, logManualWalk } from "@/lib/actions/dog-activity";
import { DateTimeField } from "@/components/dogs/datetime-field";

// "Manual entry" is the old AppSheet app's own term (Is_Manual_Entry on the
// Walks table) for logging a walk that already happened — kept rather than
// inventing new wording (docs/ui-flows.md §6, "Dog was walked, never
// checked out"). Controlled — opened from ActionMenu.
export function ManualWalkDialog({
  dogId,
  canKiosk,
  currentPersonId,
  currentPersonName,
  isOpen,
  onClose,
}: {
  dogId: string;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [volunteers, setVolunteers] = useState<{ id: string; name: string }[]>([]);
  const [personId, setPersonId] = useState(currentPersonId);
  const [checkOut, setCheckOut] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPersonId(currentPersonId);
      setCheckOut("");
      setCheckIn("");
      setNotes("");
      if (canKiosk) listActiveVolunteers().then(setVolunteers);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, canKiosk, currentPersonId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logManualWalk({
        dogId,
        personId,
        checkOut: checkOut ? new Date(checkOut).toISOString() : "",
        checkIn: checkIn ? new Date(checkIn).toISOString() : "",
        notes,
      });
      if (result.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg">Manual entry</h2>
        <p className="text-sm text-ink-muted -mt-2">
          For a walk that happened without using the app at all — nobody tapped Start Walk or End Walk.
        </p>

        {canKiosk ? (
          <label className="flex flex-col gap-1 text-sm">
            Volunteer
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              <option value={currentPersonId}>{currentPersonName}</option>
              {volunteers
                .filter((v) => v.id !== currentPersonId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          Check Out
          <DateTimeField required value={checkOut} onChange={setCheckOut} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Check In
          <DateTimeField required value={checkIn} onChange={setCheckIn} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
