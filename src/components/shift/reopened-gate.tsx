"use client";

import { useState, useTransition } from "react";
import { PART_LABEL, firstName, time12, type Part } from "@/lib/shift";
import { extendShift, switchPerson } from "@/lib/actions/shift";

const MORE_CHOICES = [15, 30, 45, 60, 120];
const FIELD = "rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal";

/** Someone tapped their name after their shift had been closed automatically
 *  (they were still working), and it has been reopened. Their time past the
 *  rostered finish must be on record, so this covers the screen until they
 *  say roughly how much longer they will work and why. It is saved as
 *  overtime, the same as "Need to extend the shift time?". The server also
 *  ends the shift at their last activity if they forget to end it, so this
 *  is never the only safeguard. */
export function ReopenedGate({
  personName,
  part,
  ends,
  endsAtIso,
}: {
  personName: string;
  part: Part;
  /** Rostered finish, "HH:MM". */
  ends: string;
  /** The same finish as an instant, to work out how far past it they already are. */
  endsAtIso: string;
}) {
  const [more, setMore] = useState("30");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (saved) return null;

  function save() {
    const extra = Math.round(Number(more));
    if (!Number.isFinite(extra) || extra < 1) {
      setError("Enter roughly how many more minutes you will work.");
      return;
    }
    if (!reason.trim()) {
      setError("Please say why you are carrying on.");
      return;
    }
    setError(null);
    // The extension is counted from the rostered finish, so add how far past
    // it they already are to how much longer they expect to work.
    const pastAlready = Math.max(0, Math.round((Date.now() - new Date(endsAtIso).getTime()) / 60000));
    startTransition(async () => {
      const r = await extendShift(pastAlready + extra, reason);
      if (r.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reopened-title"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex w-full max-w-[480px] flex-col gap-3 rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      >
        <h2 id="reopened-title" className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Welcome back, {firstName(personName)}
        </h2>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">
          Your {PART_LABEL[part].toLowerCase()} shift finished at {time12(ends)} and had closed by itself. It&rsquo;s open
          again. Please tell us roughly how much longer you will work, so your extra time is on record. This is
          required.
        </p>

        <div className="flex flex-col gap-1.5 text-xs font-bold text-foreground">
          How many more minutes?
          <div className="flex flex-wrap items-center gap-2">
            {MORE_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMore(String(m))}
                className={`h-9 rounded-[var(--radius)] border px-3 text-sm font-bold ${
                  more === String(m) ? "border-brand bg-brand-tint text-brand-ink" : "border-line text-foreground"
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
              value={more}
              onChange={(e) => setMore(e.target.value)}
              className={`${FIELD} h-9 w-24`}
              aria-label="More minutes"
            />
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-bold text-foreground">
          Why are you carrying on? (required)
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className={FIELD}
          />
        </label>

        {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
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
