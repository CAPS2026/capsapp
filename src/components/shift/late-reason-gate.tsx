"use client";

import { useState, useTransition } from "react";
import { PART_LABEL, firstName, time12, type Part } from "@/lib/shift";
import { setLateReason, switchPerson } from "@/lib/actions/shift";

/** Signing in more than the grace period late means giving a reason, and
 *  it isn't optional: this covers the whole screen until it's given.
 *  (The checklist actions also refuse on the server until then, so it
 *  can't be skipped by going round the screen.) */
export function LateReasonGate({
  personName,
  part,
  lateMinutes,
  starts,
}: {
  personName: string;
  part: Part;
  lateMinutes: number;
  /** Rostered start, "HH:MM". */
  starts: string;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (saved) return null;

  function save() {
    if (!reason.trim()) {
      setError("Please give a reason to continue.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await setLateReason(reason);
      if (r.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-reason-title"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex w-full max-w-[480px] flex-col gap-3 rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      >
        <h2 id="late-reason-title" className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {firstName(personName)}, you signed in late
        </h2>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">
          You signed in {lateMinutes} minutes after your {PART_LABEL[part].toLowerCase()} shift started ({time12(starts)}).
          Please tell us why before you carry on. This is required.
        </p>
        <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
          Reason for being late (required)
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className="rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !reason.trim()}
          className="h-11 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save and continue"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => switchPerson())}
          className="self-center text-xs font-semibold text-ink-muted disabled:opacity-50"
        >
          Not you? Switch person
        </button>
      </form>
    </div>
  );
}
