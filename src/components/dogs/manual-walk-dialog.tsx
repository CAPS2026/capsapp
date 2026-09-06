"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveVolunteers, logManualWalk } from "@/lib/actions/dog-activity";

// "Manual entry" is the old AppSheet app's own term (Is_Manual_Entry on the
// Walks table) for logging a walk that already happened — kept rather than
// inventing new wording (docs/ui-flows.md §6, "Dog was walked, never
// checked out").
export function ManualWalkDialog({
  dogId,
  isStaff,
  currentPersonId,
}: {
  dogId: string;
  isStaff: boolean;
  currentPersonId: string;
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

  function open() {
    setError(null);
    setPersonId(currentPersonId);
    setCheckOut("");
    setCheckIn("");
    setNotes("");
    if (isStaff) listActiveVolunteers().then(setVolunteers);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  // Close on outside click (native <dialog> backdrop).
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    function onClick(e: MouseEvent) {
      if (e.target === el) el?.close();
    }
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

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
        close();
        router.refresh();
      }
    });
  }

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
        Manual entry
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">Manual entry</h2>
          <p className="text-sm text-ink-muted -mt-2">
            For a walk that happened without using the app at all — nobody tapped Start Walk or End Walk.
          </p>

          {isStaff ? (
            <label className="flex flex-col gap-1 text-sm">
              Volunteer
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
              >
                <option value={currentPersonId}>Me</option>
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
            <input
              type="datetime-local"
              required
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Check In
            <input
              type="datetime-local"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            />
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
            <button type="button" onClick={close} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
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
    </>
  );
}
