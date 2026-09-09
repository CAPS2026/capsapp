"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordHomeCheck } from "@/lib/actions/homecare";
import { improvementsDraft } from "@/lib/homecare";

const inputClass =
  "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

export type HomeCheckInitial = {
  propertyOwnership: string | null;
  fenceType: string | null;
  fenceHeight: string | null;
  peopleAtHome: number | null;
  childrenU16: number | null;
  otherAnimals: string | null;
  animalDetails: string | null;
  vaccinesCurrent: boolean | null;
  notes: string | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function HomeCheckForm({
  personId,
  personName,
  firstName,
  initial,
}: {
  personId: string;
  personName: string;
  firstName: string;
  initial: HomeCheckInitial;
}) {
  const [form, setForm] = useState({
    propertyOwnership: initial.propertyOwnership ?? "",
    fenceType: initial.fenceType ?? "",
    fenceHeight: initial.fenceHeight ?? "",
    peopleAtHome: initial.peopleAtHome?.toString() ?? "",
    childrenU16: initial.childrenU16?.toString() ?? "",
    otherAnimals: initial.otherAnimals ?? "",
    animalDetails: initial.animalDetails ?? "",
    notes: initial.notes ?? "",
  });
  const [vaccines, setVaccines] = useState<"" | "yes" | "no" | "unknown">(
    initial.vaccinesCurrent == null ? "" : initial.vaccinesCurrent ? "yes" : "no",
  );
  const [outcome, setOutcome] = useState<"" | "passed" | "improvements_needed">("");
  const [items, setItems] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Keep the draft in sync with the items list until staff edits it by hand.
  function updateItems(v: string) {
    setItems(v);
    if (!emailDirty) setEmailBody(improvementsDraft({ firstName, items: v }));
  }

  function go(sendEmail: boolean) {
    setError(null);
    if (!outcome) {
      setError("Pick an outcome for the home check.");
      return;
    }
    startTransition(async () => {
      const r = await recordHomeCheck({
        personId,
        outcome,
        ...form,
        vaccinesCurrent: vaccines === "yes" ? true : vaccines === "no" ? false : null,
        emailBody: outcome === "improvements_needed" && sendEmail ? emailBody : undefined,
      });
      if (r.ok) router.push(`/people/${personId}`);
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">Record what you saw at {personName}&apos;s home.</p>

      <Field label="Property">
        <select
          className={inputClass}
          value={form.propertyOwnership}
          onChange={(e) => set("propertyOwnership", e.target.value)}
        >
          <option value="">—</option>
          <option value="Owned">Owned</option>
          <option value="Rented">Rented</option>
          <option value="Other">Other</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fence type">
          <input className={inputClass} value={form.fenceType} onChange={(e) => set("fenceType", e.target.value)} />
        </Field>
        <Field label="Fence height">
          <input className={inputClass} value={form.fenceHeight} onChange={(e) => set("fenceHeight", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="People at home">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className={inputClass}
            value={form.peopleAtHome}
            onChange={(e) => set("peopleAtHome", e.target.value)}
          />
        </Field>
        <Field label="Children under 16">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className={inputClass}
            value={form.childrenU16}
            onChange={(e) => set("childrenU16", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Other animals">
        <input
          className={inputClass}
          placeholder="e.g. 2 cats, 1 dog"
          value={form.otherAnimals}
          onChange={(e) => set("otherAnimals", e.target.value)}
        />
      </Field>

      <Field label="Notes on the other animals">
        <textarea
          rows={2}
          className={areaClass}
          value={form.animalDetails}
          onChange={(e) => set("animalDetails", e.target.value)}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Other pets&apos; vaccinations up to date?</legend>
        <div className="flex gap-2">
          {(
            [
              ["yes", "Yes"],
              ["no", "No"],
              ["unknown", "Unknown"],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v}
              className={`flex-1 flex items-center justify-center gap-2 text-sm h-11 rounded-[var(--radius)] border cursor-pointer ${
                vaccines === v ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
              }`}
            >
              <input type="radio" name="vaccines" checked={vaccines === v} onChange={() => setVaccines(v)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="General notes / observations">
        <textarea
          rows={3}
          className={areaClass}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
        <legend className="text-sm font-bold">Outcome</legend>
        {(
          [
            ["passed", "Home meets our requirements — ready to approve"],
            ["improvements_needed", "Some improvements needed first"],
          ] as const
        ).map(([v, label]) => (
          <label
            key={v}
            className={`flex items-start gap-2 text-sm px-3 py-2 rounded-[var(--radius)] border cursor-pointer ${
              outcome === v ? "border-brand bg-brand-tint" : "border-line-cool"
            }`}
          >
            <input
              type="radio"
              name="outcome"
              className="mt-0.5"
              checked={outcome === v}
              onChange={() => setOutcome(v)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {outcome === "improvements_needed" && (
        <div className="flex flex-col gap-3 border border-warm rounded-[var(--radius)] bg-warm-tint p-4">
          <Field label="What needs to change? (one per line — goes into the email)">
            <textarea
              rows={3}
              className={areaClass}
              placeholder={"- Raise the back fence to at least 1.5m\n- Fill the gap beside the gate"}
              value={items}
              onChange={(e) => updateItems(e.target.value)}
            />
          </Field>
          <Field label="Email to the applicant — edit before sending">
            <textarea
              rows={9}
              className={areaClass}
              value={emailBody}
              onChange={(e) => {
                setEmailBody(e.target.value);
                setEmailDirty(true);
              }}
            />
          </Field>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {outcome === "improvements_needed" ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => go(true)}
              className="h-12 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save & email the applicant"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => go(false)}
              className="h-11 rounded-[var(--radius)] border border-line-cool font-semibold disabled:opacity-60"
            >
              Save without emailing
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => go(false)}
            className="h-12 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Record home check"}
          </button>
        )}
      </div>
    </form>
  );
}
