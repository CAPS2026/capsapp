"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivePerson, restorePerson } from "@/lib/actions/people";

const REASONS = ["Moved away", "No longer volunteering", "Asked to leave", "Passed away", "Other"];

export function PersonArchiveButton({
  personId,
  archived,
}: {
  personId: string;
  archived: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = archived ? await restorePerson(personId) : await archivePerson(personId, note.trim() ? `${reason} - ${note.trim()}` : reason);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        dialogRef.current?.close();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialogRef.current?.showModal();
        }}
        className="text-sm font-semibold text-ink-muted underline underline-offset-2"
      >
        {archived ? "Restore" : "Archive"}
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">{archived ? "Restore this person?" : "Archive this person?"}</h2>
          <p className="text-sm text-ink-muted">
            {archived
              ? "Their volunteer role comes back as active. Any carer roles come back as pending and need approving again."
              : "Every current role is ended, so they drop off the walker and carer lists. You can restore them later."}
          </p>
          {!archived && (
            <>
              <label className="text-sm font-semibold">
                Reason
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 block w-full h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base font-normal"
                >
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Note (optional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 block w-full h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base font-normal"
                />
              </label>
            </>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-10 px-4 rounded-[var(--radius)] font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={confirm}
              className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {isPending ? "Working…" : archived ? "Restore" : "Archive"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
