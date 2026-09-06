"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editActivityTimes } from "@/lib/actions/dog-activity";
import { toDatetimeLocalValue } from "@/lib/format";

// docs/ui-flows.md §6, "Wrong time on an existing record" — for a row that
// already exists (open or closed) but was logged with the wrong time(s).
export function EditActivityDialog({
  dogId,
  activityId,
  startedAt,
  endedAt,
}: {
  dogId: string;
  activityId: string;
  startedAt: string;
  endedAt: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [checkOut, setCheckOut] = useState(toDatetimeLocalValue(startedAt));
  const [checkIn, setCheckIn] = useState(endedAt ? toDatetimeLocalValue(endedAt) : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await editActivityTimes({
        activityId,
        dogId,
        startedAt: checkOut ? new Date(checkOut).toISOString() : "",
        endedAt: checkIn ? new Date(checkIn).toISOString() : null,
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
        Edit times
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold text-lg">Edit times</h2>

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
            Check In {!endedAt && <span className="text-ink-muted">(leave blank if still out)</span>}
            <input
              type="datetime-local"
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
