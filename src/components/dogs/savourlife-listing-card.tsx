"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSavourLifeListing } from "@/lib/actions/savourlife";
import { SL_HOLD_REASONS, SL_STATUSES, type SlStatus } from "@/lib/savourlife-status";

const inputClass = "h-10 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm w-full";

export type SlListing = {
  status: SlStatus;
  savourlifeId: number | null;
  holdReason: string | null;
  enquiryNumber: string | null;
  changedAt: string | null;
};

// Where the dog stands on SavourLife. SavourLife isn't linked to this app, so staff set this after
// doing the same thing on SavourLife (list it, put it on hold, mark it adopted, remove it).
export function SavourLifeListingCard({ dogId, current }: { dogId: string; current: SlListing }) {
  const [status, setStatus] = useState<SlStatus>(current.status);
  const [slId, setSlId] = useState(current.savourlifeId ? String(current.savourlifeId) : "");
  const [hold, setHold] = useState(current.holdReason ?? "");
  const [enquiry, setEnquiry] = useState(current.enquiryNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const help = SL_STATUSES.find((s) => s.code === status)?.help;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await updateSavourLifeListing(dogId, { status, savourlifeId: slId, holdReason: hold, enquiryNumber: enquiry });
      if (!("ok" in r)) return setError(r.error);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3 border border-line rounded-[var(--radius)] bg-card p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink" style={{ fontFamily: "var(--font-display)" }}>
          SavourLife listing
        </h2>
        {current.changedAt && (
          <span className="text-xs text-ink">Last changed {new Date(current.changedAt).toLocaleDateString("en-AU")}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SL_STATUSES.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => setStatus(s.code)}
            className={`h-10 px-4 rounded-full text-sm font-semibold border ${
              status === s.code ? "bg-brand text-white border-brand" : "bg-white border-line-cool text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {help && <p className="text-xs text-ink">{help}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {status !== "not_listed" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">SavourLife ID</span>
            <input
              inputMode="numeric"
              className={inputClass}
              placeholder="e.g. 124637"
              value={slId}
              onChange={(e) => setSlId(e.target.value)}
            />
          </label>
        )}
        {status === "on_hold" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Why on hold</span>
            <select className={inputClass} value={hold} onChange={(e) => setHold(e.target.value)}>
              <option value="">Select…</option>
              {SL_HOLD_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
        {status === "adopted" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Enquiry number</span>
            <input
              className={inputClass}
              placeholder="From the adopted enquiry"
              value={enquiry}
              onChange={(e) => setEnquiry(e.target.value)}
            />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="h-10 px-5 rounded-[var(--radius)] bg-brand text-white text-sm font-bold disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save listing status"}
        </button>
        {saved && <span className="text-sm font-semibold text-ok">Saved ✓</span>}
      </div>
    </section>
  );
}
