"use client";

import { useState, useTransition } from "react";
import { MEDS_STYLE, clockTime, hhmm } from "@/lib/shift";
import { doseNotGiven, giveDose, undoDose } from "@/lib/actions/shift";
import type { DoseReason, DueDose, VetAppointment } from "@/lib/care-data";

const REASONS: { key: DoseReason; label: string }[] = [
  { key: "refused", label: "Refused" },
  { key: "vomited", label: "Vomited it up" },
  { key: "away", label: "Dog is away (vet, foster)" },
  { key: "other", label: "Other" },
];

/** "MEDICATION ALERT: check who gets fed" at the top of the checklist:
 *  today's doses for this shift and anything from the vet that affects
 *  feeding. Information only, nothing to tick. */
export function MedicationAlert({ doses, vet }: { doses: DueDose[]; vet: VetAppointment[] }) {
  const vetLines = vet.filter((a) => a.instructions?.trim());
  if (doses.length === 0 && vetLines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border-2 px-3.5 py-2.5" style={{ borderColor: MEDS_STYLE.accent, background: MEDS_STYLE.tint }}>
      <h2 className="m-0 text-[15px] font-extrabold" style={{ color: MEDS_STYLE.ink }}>
        <span className="text-[17px] tracking-[0.03em]">MEDICATION ALERT:</span> check who gets fed
      </h2>
      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-[13.5px] leading-snug text-foreground">
        {vetLines.map((a) => (
          <li key={a.id}>
            <b>{a.dogName}:</b> {a.instructions} (vet {a.time ? hhmm(a.time) : a.part})
          </li>
        ))}
        {doses.map((d) => (
          <li key={d.medication.id}>
            <b>{d.medication.dogName}:</b> {d.medication.medicine}
            {d.medication.howGiven ? `, ${d.medication.howGiven}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The Medications section: one row per dose due this shift. Given is a
 *  tick; Not given needs a reason (see NotGivenDialog). */
export function MedicationSection({ doses, readOnly = false }: { doses: DueDose[]; readOnly?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notGiven, setNotGiven] = useState<DueDose | null>(null);
  if (doses.length === 0) return null;
  const done = doses.filter((d) => d.status !== null).length;

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
    });
  };

  return (
    <div
      className="mb-2.5 inline-block w-full break-inside-avoid overflow-hidden rounded-[var(--radius)] border border-line bg-card align-top"
      style={{ borderLeft: `4px solid ${MEDS_STYLE.accent}` }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5" style={{ background: MEDS_STYLE.tint }}>
        <span className="text-sm font-extrabold" style={{ color: MEDS_STYLE.ink }}>
          Medications
        </span>
        <span
          className="rounded-full px-2 py-px text-[11px] font-extrabold tabular-nums text-white"
          style={{ background: done === doses.length ? "var(--ok)" : MEDS_STYLE.accent }}
        >
          {done}/{doses.length}
        </span>
      </div>
      {error && <p className="m-0 px-3 pt-2 text-sm text-danger">{error}</p>}
      <div className="divide-y divide-line border-t border-line">
        {doses.map((d) => (
          <div key={d.medication.id} className="flex items-center gap-2.5 px-3 py-[9px]">
            <button
              type="button"
              disabled={readOnly || isPending || d.status === "not_given"}
              onClick={() => run(() => (d.status === "given" ? undoDose(d.medication.id) : giveDose(d.medication.id)))}
              aria-label={d.status === "given" ? "Untick: not given yet" : "Given"}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 text-xs font-extrabold disabled:cursor-default ${
                d.status === "given"
                  ? "border-ok bg-ok text-white"
                  : d.status === "not_given"
                    ? "border-danger bg-[#FDECEC] text-danger"
                    : "border-line-cool bg-white"
              }`}
            >
              {d.status === "given" ? "✓" : d.status === "not_given" ? "✕" : ""}
            </button>
            <div className="min-w-0 flex-1">
              <div className={`text-[13.5px] font-extrabold leading-[1.35] ${d.status === "given" ? "text-ink-muted line-through" : "text-foreground"}`}>
                {d.medication.dogName}
              </div>
              <div className="text-xs text-ink-muted">
                {d.medication.medicine}
                {d.medication.howGiven ? `, ${d.medication.howGiven}` : ""}
              </div>
              {d.medication.notes && <div className="text-xs text-ink-muted">{d.medication.notes}</div>}
              {d.status === "given" && d.at && (
                <div className="mt-[3px] text-[10.5px] font-semibold text-ok">
                  {d.byInitials} &middot; {clockTime(d.at)}
                </div>
              )}
              {d.status === "not_given" && (
                <div className="mt-[3px] text-[11px] font-bold text-danger">
                  Not given: {REASONS.find((x) => x.key === d.reason)?.label ?? "no reason"}
                  {d.note ? `, ${d.note}` : ""}
                  {d.byInitials ? `, ${d.byInitials}` : ""}
                  {d.at ? ` ${clockTime(d.at)}` : ""}
                </div>
              )}
            </div>
            {!readOnly && d.status === null && (
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => giveDose(d.medication.id))}
                  className="h-9 rounded-[var(--radius)] bg-ok px-3 text-[13px] font-extrabold text-white disabled:opacity-50"
                >
                  Given
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setNotGiven(d)}
                  className="h-9 rounded-[var(--radius)] border-[1.5px] border-danger px-3 text-[13px] font-extrabold text-danger disabled:opacity-50"
                >
                  Not given
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {notGiven && <NotGivenDialog dose={notGiven} onClose={() => setNotGiven(null)} />}
    </div>
  );
}

/** Why a dose wasn't given. Required. Doesn't close on a click outside. */
function NotGivenDialog({ dose, onClose }: { dose: DueDose; onClose: () => void }) {
  const [reason, setReason] = useState<DoseReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const m = dose.medication;

  function save() {
    if (!reason) {
      setError("Choose why it wasn't given.");
      return;
    }
    setError(null);
    const chosen = reason;
    startTransition(async () => {
      const r = await doseNotGiven(m.id, chosen, note);
      if (r.error) setError(r.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6">
      <div role="dialog" aria-modal="true" aria-label="Dose not given" className="flex w-full max-w-[480px] flex-col gap-3 rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <h2 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {m.dogName}: dose not given
        </h2>
        <p className="m-0 text-sm text-ink-muted">
          {m.medicine}
          {m.howGiven ? `, ${m.howGiven}` : ""}
        </p>
        <p className="m-0 text-xs font-bold">Why wasn&rsquo;t it given? (required)</p>
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setReason(x.key)}
              className={`rounded-[var(--radius)] border-[1.5px] px-3 py-2.5 text-left text-sm font-extrabold ${
                reason === x.key ? "border-brand bg-brand-tint text-brand-ink" : "border-line bg-card text-foreground"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold">
          {reason === "other" ? "What happened? (required)" : "Anything else? (optional)"}
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        {reason && (
          <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
            {reason === "away"
              ? "This is noted in the handover log. Nobody is emailed."
              : `Shayna will be emailed now, and the handover log will say: check with Shayna before giving it.`}
          </p>
        )}
        {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={save}
            className="h-11 flex-1 rounded-[var(--radius)] bg-danger text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save: not given"}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
