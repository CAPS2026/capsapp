"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exitCafeMode } from "@/lib/actions/cafe";
import { PIN_MAX } from "@/lib/cafe";

// The always-visible strip under the header while a device is in café
// mode. Makes it obvious you're on the limited surface, and carries the
// "Staff access" PIN step-up.
export function CafeBar() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    setPin("");
    setError(null);
    dialogRef.current?.showModal();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await exitCafeMode(pin);
      if ("error" in res) {
        setError(res.error);
        setPin("");
      } else {
        dialogRef.current?.close();
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-warm-tint border-b border-warm/40">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 h-10">
        <span className="text-xs font-bold uppercase tracking-wide text-warm-ink">
          Volunteer mode
        </span>
        <button
          type="button"
          onClick={open}
          className="text-sm font-semibold text-warm-ink underline underline-offset-2"
        >
          Staff access
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">Staff PIN</h2>
          <p className="text-sm text-ink-muted">
            Enter the shared staff PIN to switch this device back to full access.
          </p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={PIN_MAX}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="h-12 px-3 rounded-[var(--radius)] border border-line text-lg tracking-[0.4em] text-center"
            placeholder="••••"
          />
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
              type="submit"
              disabled={isPending || pin.length < 4}
              className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {isPending ? "Checking…" : "Unlock"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
