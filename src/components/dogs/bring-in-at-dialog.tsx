"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bringDogInAt } from "@/lib/actions/dog-activity";

// docs/ui-flows.md §5 full path, "Came back earlier" — the dog was already
// started in-app (there's an open activity) but the return wasn't logged
// at the time. Distinct from Manual entry, which is for a walk that never
// touched the app at all.
export function BringInAtDialog({ dogId }: { dogId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [checkIn, setCheckIn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    setError(null);
    setCheckIn("");
    setNotes("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await bringDogInAt(dogId, checkIn ? new Date(checkIn).toISOString() : "", notes);
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
        Came back earlier?
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold text-lg">Came back earlier</h2>
          <p className="text-sm text-ink-muted -mt-2">Already back, but nobody tapped the button at the time.</p>

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
