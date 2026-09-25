"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveHealthConcern } from "@/lib/actions/shift";
import { PART_LABEL, clock12, parseYmd } from "@/lib/shift";
import type { HealthConcernRow } from "@/lib/shift-data";

/** Health concerns, on the Handover log tab: the ones not yet dealt with
 *  first. Everyone can see whether a concern has been dealt with; only
 *  admins can mark one as dealt with, with an optional note of what was
 *  done. */
export function HealthConcernsList({ concerns, isAdmin }: { concerns: HealthConcernRow[]; isAdmin: boolean }) {
  const open = concerns.filter((c) => !c.resolvedAt).length;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Health concerns{open > 0 ? ` (${open} not yet dealt with)` : ""}
      </h2>
      {concerns.length === 0 && <p className="m-0 text-sm text-ink-muted">No health concerns raised.</p>}
      {concerns.map((c) => (
        <Concern key={c.id} c={c} isAdmin={isAdmin} />
      ))}
    </section>
  );
}

function Concern({ c, isAdmin }: { c: HealthConcernRow; isAdmin: boolean }) {
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const day = parseYmd(c.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await resolveHealthConcern(c.id, note);
      if (r.error) setError(r.error);
      else {
        setMarking(false);
        router.refresh();
      }
    });
  }

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-[var(--radius)] border p-3 ${
        c.resolvedAt ? "border-line bg-card" : "border-[#E2725B] bg-[#FCEDE8]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 text-sm font-extrabold">
          {c.urgent && <span className="mr-1 text-danger">URGENT</span>}
          {c.dogName ?? "Dog not named"}
        </p>
        <span className="text-xs font-semibold text-ink-muted">
          {c.personName}, {day} {PART_LABEL[c.part].toLowerCase()}, {clock12(c.createdAt)}
        </span>
      </div>
      <p className="m-0 whitespace-pre-wrap text-sm">{c.body}</p>

      {c.resolvedAt ? (
        <p className="m-0 text-xs font-semibold text-ok">
          Dealt with{c.resolvedByName ? ` by ${c.resolvedByName}` : ""},{" "}
          {new Date(c.resolvedAt).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short" })}
          {c.resolvedNote ? `: ${c.resolvedNote}` : ""}
        </p>
      ) : isAdmin ? (
        marking ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold">
              What was done? (optional)
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal"
              />
            </label>
            {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={save}
                className="h-10 rounded-[var(--radius)] bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Mark as dealt with"}
              </button>
              <button
                type="button"
                onClick={() => setMarking(false)}
                className="h-10 rounded-[var(--radius)] border border-line px-3 text-sm font-bold text-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMarking(true)}
            className="h-9 self-start rounded-[var(--radius)] border-[1.5px] border-brand px-3 text-sm font-bold text-brand-ink"
          >
            Mark as dealt with
          </button>
        )
      ) : (
        <p className="m-0 text-xs font-semibold text-warm-ink">Not yet dealt with</p>
      )}
    </div>
  );
}
