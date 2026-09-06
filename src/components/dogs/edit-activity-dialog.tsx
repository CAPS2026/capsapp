"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editActivityTimes } from "@/lib/actions/dog-activity";
import { toDatetimeLocalValue } from "@/lib/format";
import { DateTimeField } from "@/components/dogs/datetime-field";

// docs/ui-flows.md §6, "Wrong time on an existing record" — for a row that
// already exists (open or closed) but was logged with the wrong time(s).
// Works two ways: with its own "Edit times" trigger (the activity log use),
// or fully controlled via isOpen/onClose (the "wrong time?" prompt shown
// right after tapping End X, from dog-action-button.tsx).
export function EditActivityDialog({
  dogId,
  activityId,
  startedAt,
  endedAt,
  isOpen,
  onClose,
}: {
  dogId: string;
  activityId: string;
  startedAt: string;
  endedAt: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const controlled = isOpen !== undefined;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [checkOut, setCheckOut] = useState(toDatetimeLocalValue(startedAt));
  const [checkIn, setCheckIn] = useState(endedAt ? toDatetimeLocalValue(endedAt) : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!controlled) return;
    if (isOpen) {
      setError(null);
      setCheckOut(toDatetimeLocalValue(startedAt));
      setCheckIn(endedAt ? toDatetimeLocalValue(endedAt) : "");
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [controlled, isOpen, startedAt, endedAt]);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  // Only ever closes via the native <dialog> "close" event (wired to
  // onClose below) — Escape, a backdrop click, and this call all funnel
  // through the same path, so the parent is notified exactly once instead
  // of this and the dialog's own onClose both firing.
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
        router.refresh();
        close();
      }
    });
  }

  return (
    <>
      {!controlled && (
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
      )}

      <dialog
        ref={dialogRef}
        onClose={onClose}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold text-lg">Edit times</h2>

          <label className="flex flex-col gap-1 text-sm">
            Check Out
            <DateTimeField required value={checkOut} onChange={setCheckOut} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Check In {!endedAt && <span className="text-ink-muted">(leave blank if still out)</span>}
            <DateTimeField value={checkIn} onChange={setCheckIn} />
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
