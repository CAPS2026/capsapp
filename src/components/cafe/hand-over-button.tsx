"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enterCafeMode } from "@/lib/actions/cafe";

// Shown in the header for a staff account that is NOT already in café
// mode. Tapping it drops the shared device to the limited volunteer
// surface; getting back needs the staff PIN.
export function HandOverButton({ pinIsSet }: { pinIsSet: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      await enterCafeMode();
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-sm font-semibold text-brand-ink underline underline-offset-2"
      >
        Hand over
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">Hand this device to volunteers?</h2>
          <p className="text-sm text-ink-muted">
            The app switches to the volunteer surface — walk and yard check in/out, sign-in,
            basic dog info. Confidential notes, the People area, placements, reports and
            deleting are hidden until someone enters the staff PIN.
          </p>
          {!pinIsSet && (
            <p className="text-sm text-warm-ink font-semibold">
              No staff PIN is set yet — set one first, otherwise there&rsquo;s no way to switch
              this device back to full access.
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-10 px-4 rounded-[var(--radius)] font-semibold"
            >
              Cancel
            </button>
            {pinIsSet ? (
              <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
              >
                {isPending ? "Switching…" : "Hand over"}
              </button>
            ) : (
              <Link
                href="/settings"
                onClick={() => dialogRef.current?.close()}
                className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold flex items-center"
              >
                Set a PIN
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
