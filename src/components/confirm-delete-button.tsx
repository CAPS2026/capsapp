"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { error?: string } | void;

export function ConfirmDeleteButton({
  triggerLabel,
  heading,
  body,
  confirmLabel,
  action,
  redirectTo,
  triggerClassName = "text-sm font-semibold text-danger underline underline-offset-2",
}: {
  triggerLabel: string;
  heading: string;
  body: string;
  confirmLabel: string;
  action: () => Promise<Result>;
  redirectTo: string;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialogRef.current?.showModal();
        }}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">{heading}</h2>
          <p className="text-sm text-ink-muted">{body}</p>
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
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await action();
                  if (r && "error" in r && r.error) setError(r.error);
                  else {
                    dialogRef.current?.close();
                    router.push(redirectTo);
                  }
                })
              }
              className="h-10 px-4 rounded-[var(--radius)] bg-danger text-white font-bold disabled:opacity-60"
            >
              {isPending ? "Deleting…" : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
