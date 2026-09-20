"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { endShift, extendShift, flagHealthConcern } from "@/lib/actions/shift";

/** Shared pop-up shell, same look as the late-reason prompt. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[480px] flex-col gap-3 overflow-y-auto rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      >
        <h2 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

const FIELD = "rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal";

/** Finishing more than the grace period before the rostered end: a reason
 *  is required, and goes in the shift email. */
export function EndEarlyDialog({
  minutesEarly,
  onClose,
  onEnded,
}: {
  minutesEarly: number;
  onClose: () => void;
  onEnded: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!reason.trim()) {
      setError("Please give a reason for finishing early.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await endShift(reason);
      if (r.error) setError(r.error);
      else onEnded();
    });
  }

  return (
    <Modal title="Finishing early?" onClose={onClose}>
      <p className="m-0 text-sm leading-relaxed text-ink-muted">
        Your shift isn&rsquo;t due to finish for another {minutesEarly} minutes. Please say why you&rsquo;re finishing
        early. This is required and goes in the shift email.
      </p>
      <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
        Reason (required)
        <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
      </label>
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="h-11 flex-1 rounded-[var(--radius)] border-[1.5px] border-danger text-sm font-bold text-danger disabled:opacity-50"
        >
          {isPending ? "Ending…" : "End shift"}
        </button>
        <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
          Keep working
        </button>
      </div>
    </Modal>
  );
}

const EXTRA_CHOICES = [15, 30, 45, 60];

/** Overtime: how long past the rostered end they worked, and why. */
export function ExtendShiftDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [minutes, setMinutes] = useState<string>("30");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await extendShift(Number(minutes), reason);
      if (r.error) setError(r.error);
      else onSaved();
    });
  }

  return (
    <Modal title="Extend your shift" onClose={onClose}>
      <p className="m-0 text-sm leading-relaxed text-ink-muted">
        Staying on past the rostered finish? Say how long you stayed on after it, and why. It goes in the shift email.
      </p>
      <div className="flex flex-col gap-1.5 text-xs font-bold text-foreground">
        Minutes past the rostered end
        <div className="flex flex-wrap items-center gap-2">
          {EXTRA_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className={`h-9 rounded-[var(--radius)] border px-3 text-sm font-bold ${
                minutes === String(m) ? "border-brand bg-brand-tint text-brand-ink" : "border-line text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={600}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={`${FIELD} h-9 w-24`}
            aria-label="Minutes"
          />
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
        Reason (required)
        <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
      </label>
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="h-11 flex-1 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/** "Flag a health concern": type it in, and it is emailed straight away.
 *  If nobody is set up to receive it, it says so, so nobody assumes the
 *  President has been told when she hasn't. */
export function HealthConcernDialog({ onClose }: { onClose: () => void }) {
  const [dogName, setDogName] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ emailed: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!body.trim()) {
      setError("Describe the concern first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await flagHealthConcern({ body, dogName, urgent });
      if (r.error) setError(r.error);
      else setResult({ emailed: r.emailed === true });
    });
  }

  if (result) {
    return (
      <Modal title="Health concern recorded" onClose={onClose}>
        {result.emailed ? (
          <p className="m-0 text-sm leading-relaxed text-foreground">
            It has been emailed to Shayna now, and it will also appear in this shift&rsquo;s email.
          </p>
        ) : (
          <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold leading-relaxed text-warm-ink">
            It has been saved and will appear in this shift&rsquo;s email, but it was NOT emailed straight away. If it
            is urgent, please contact Shayna directly.
          </p>
        )}
        <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius)] bg-brand text-sm font-bold text-white">
          Done
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Flag a health concern" onClose={onClose}>
      <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
        Dog (optional)
        <input value={dogName} onChange={(e) => setDogName(e.target.value)} className={`${FIELD} h-10`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
        What is the concern?
        <textarea autoFocus rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={FIELD} />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-foreground">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="h-5 w-5" />
        Urgent, needs attention now
      </label>
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="h-11 flex-1 rounded-[var(--radius)] bg-danger text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send to Shayna"}
        </button>
        <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
          Cancel
        </button>
      </div>
    </Modal>
  );
}
