"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivePerson, restorePerson } from "@/lib/actions/people";

export function PersonArchiveButton({
  personId,
  archived,
}: {
  personId: string;
  archived: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = archived ? await restorePerson(personId) : await archivePerson(personId);
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
