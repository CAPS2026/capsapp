"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordHomeCheck } from "@/lib/actions/homecare";
import { approvedDraft, improvementsDraft } from "@/lib/homecare";
import { EMPTY_HOME, EMPTY_PET, homePayload, parseHomeText, type Pet, type YesNo } from "@/lib/homecare-form";
import {
  ANIMAL_COUNTS,
  CHILD_AGES,
  CHILDREN,
  FENCE_HEIGHTS,
  FENCE_TYPES,
  OWNERSHIP_TYPES,
  PEOPLE_AT_HOME,
  PET_TYPES,
  TEMPERAMENTS,
  YES_NO,
} from "@/lib/home-options";
import { Pick, PickOther } from "@/components/apply/pick";

const inputClass =
  "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

export type HomeCheckInitial = {
  address: string | null;
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

/** "fostering", "jail break" or "fostering and jail break". */
function programsText(programs: ("foster" | "jail_break")[]) {
  const words = [programs.includes("foster") && "fostering", programs.includes("jail_break") && "jail break"].filter(
    Boolean,
  ) as string[];
  return words.length ? words.join(" and ") : "fostering";
}

export function HomeCheckForm({
  personId,
  personName,
  firstName,
  programs,
  initial,
}: {
  personId: string;
  personName: string;
  firstName: string;
  /** What they applied for — fills the "approved for ____" line of the email. */
  programs: ("foster" | "jail_break")[];
  initial: HomeCheckInitial;
}) {
  // The applicant's earlier answers come back out of the stored text, so the
  // assessor sees (and can correct) each child and each animal.
  const parsed = parseHomeText(initial.animalDetails);
  const legacyAnimals =
    parsed.pets.length === 0 && initial.otherAnimals && !/^no\b/i.test(initial.otherAnimals) ? initial.otherAnimals : "";

  const [form, setForm] = useState({
    propertyOwnership: initial.propertyOwnership ?? "",
    fenceType: initial.fenceType ?? "",
    fenceHeight: initial.fenceHeight ?? "",
    peopleAtHome: initial.peopleAtHome?.toString() ?? "",
    childrenU16: initial.childrenU16?.toString() ?? "",
    notes: initial.notes ?? "",
  });
  const [childAges, setChildAges] = useState<string[]>(parsed.childAges);
  const [animalCount, setAnimalCount] = useState(
    parsed.pets.length > 0 ? String(Math.min(parsed.pets.length, 10)) : /^no\b/i.test(initial.otherAnimals ?? "") ? "0" : "",
  );
  const [pets, setPets] = useState<Pet[]>(parsed.pets);
  const [animalNotes, setAnimalNotes] = useState(parsed.extra);
  const [outcome, setOutcome] = useState<"" | "passed" | "improvements_needed">("");
  const [comments, setComments] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const kids = Math.max(0, parseInt(form.childrenU16, 10) || 0);
  const programWords = programsText(programs);

  function draftFor(o: "passed" | "improvements_needed", text: string) {
    return o === "passed"
      ? approvedDraft({ firstName, programs: programWords, comments: text })
      : improvementsDraft({ firstName, items: text });
  }

  // Keep the draft in sync with the outcome and comments until staff edits it by hand.
  function pickOutcome(o: "passed" | "improvements_needed") {
    setOutcome(o);
    setEmailDirty(false);
    setEmailBody(draftFor(o, comments));
  }
  function updateComments(v: string) {
    setComments(v);
    if (outcome && !emailDirty) setEmailBody(draftFor(outcome, v));
  }

  function setCount(v: string) {
    setAnimalCount(v);
    const n = Math.max(0, parseInt(v, 10) || 0);
    setPets((p) => Array.from({ length: n }, (_, i) => p[i] ?? { ...EMPTY_PET }));
  }

  function go(sendEmail: boolean) {
    setError(null);
    if (!outcome) {
      setError("Pick an outcome for the home check.");
      return;
    }
    const vaccinesCurrent = pets.length
      ? pets.every((p) => p.vaccinated === "yes")
        ? true
        : pets.some((p) => p.vaccinated === "no")
          ? false
          : null
      : initial.vaccinesCurrent;
    // Same flattening the public form uses, so the stored text stays readable and parseable.
    const flat = homePayload({
      ...EMPTY_HOME,
      propertyOwnership: form.propertyOwnership,
      fenceType: form.fenceType,
      fenceHeight: form.fenceHeight,
      peopleAtHome: form.peopleAtHome,
      childrenU16: form.childrenU16,
      childAges,
      otherAnimals: pets.length ? "Yes" : animalCount === "0" ? "No" : legacyAnimals,
      animalDetails:
        pets.length || kids
          ? animalNotes
          : [legacyAnimals && `Earlier answer: ${legacyAnimals}`, animalNotes].filter(Boolean).join("\n"),
      pets,
    });
    startTransition(async () => {
      const r = await recordHomeCheck({
        personId,
        outcome,
        propertyOwnership: flat.propertyOwnership,
        fenceType: flat.fenceType,
        fenceHeight: flat.fenceHeight,
        peopleAtHome: flat.peopleAtHome,
        childrenU16: flat.childrenU16,
        otherAnimals: flat.otherAnimals,
        animalDetails: flat.animalDetails,
        vaccinesCurrent,
        notes: form.notes,
        emailBody: sendEmail ? emailBody : undefined,
      });
      if (r.ok) router.push(`/people/${personId}`);
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">Record what you saw at {personName}&apos;s home.</p>

      <div className="rounded-[var(--radius)] bg-gray-tint p-3 text-sm">
        <span className="font-semibold">Address: </span>
        {initial.address?.trim() ? (
          initial.address
        ) : (
          <span className="text-warm-ink">No address on file — confirm it with the applicant.</span>
        )}
      </div>

      <Field label="Ownership type">
        <Pick value={form.propertyOwnership} onChange={(v) => set("propertyOwnership", v)} options={OWNERSHIP_TYPES} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fence type">
          <PickOther value={form.fenceType} onChange={(v) => set("fenceType", v)} options={FENCE_TYPES} />
        </Field>
        <Field label="Fence height">
          <PickOther
            value={form.fenceHeight}
            onChange={(v) => set("fenceHeight", v)}
            options={FENCE_HEIGHTS}
            otherLabel="Please specify (feet or metres)"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="People at home">
          <Pick value={form.peopleAtHome} onChange={(v) => set("peopleAtHome", v)} options={PEOPLE_AT_HOME} />
        </Field>
        <Field label="Children under 16">
          <Pick value={form.childrenU16} onChange={(v) => set("childrenU16", v)} options={CHILDREN} />
        </Field>
      </div>

      {kids > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: kids }, (_, i) => (
            <Field key={i} label={`Age of child ${i + 1}`}>
              <Pick
                value={childAges[i] ?? ""}
                onChange={(v) =>
                  setChildAges((a) => {
                    const next = [...a];
                    while (next.length <= i) next.push("");
                    next[i] = v;
                    return next;
                  })
                }
                options={CHILD_AGES}
              />
            </Field>
          ))}
        </div>
      )}

      <Field label="Other animals at home">
        <Pick value={animalCount} onChange={setCount} options={ANIMAL_COUNTS} />
      </Field>
      {legacyAnimals && pets.length === 0 && (
        <p className="text-sm text-ink bg-gray-tint rounded-[var(--radius)] p-2">
          Earlier answer: {legacyAnimals}. Choose how many animals above to record each one properly.
        </p>
      )}

      {pets.map((p, i) => {
        const setPet = <K extends keyof Pet>(k: K, v: Pet[K]) =>
          setPets((all) => all.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
        return (
          <fieldset key={i} className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-3">
            <legend className="text-sm font-bold px-1">Animal {i + 1}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Species">
                <PickOther value={p.type} onChange={(v) => setPet("type", v)} options={PET_TYPES} />
              </Field>
              <Field label="Breed">
                <input className={inputClass} value={p.breed} onChange={(e) => setPet("breed", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input
                  className={inputClass}
                  placeholder="e.g. 3 years"
                  value={p.age}
                  onChange={(e) => setPet("age", e.target.value)}
                />
              </Field>
              <Field label="Temperament">
                <Pick value={p.temperament} onChange={(v) => setPet("temperament", v)} options={TEMPERAMENTS} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desexed?">
                <Pick value={p.desexed} onChange={(v) => setPet("desexed", v as YesNo)} options={YES_NO} />
              </Field>
              <Field label="Vaccinations and prevention up to date?">
                <Pick value={p.vaccinated} onChange={(v) => setPet("vaccinated", v as YesNo)} options={YES_NO} />
              </Field>
            </div>
          </fieldset>
        );
      })}

      <Field label="Notes on the other animals">
        <textarea rows={2} className={areaClass} value={animalNotes} onChange={(e) => setAnimalNotes(e.target.value)} />
      </Field>

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
              onChange={() => pickOutcome(v)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {outcome && (
        <div
          className={`flex flex-col gap-3 border rounded-[var(--radius)] p-4 ${
            outcome === "passed" ? "border-ok bg-brand-tint" : "border-warm bg-warm-tint"
          }`}
        >
          <Field
            label={
              outcome === "passed"
                ? "Comments for the applicant (optional — goes into the email)"
                : "What needs to change? (one per line — goes into the email)"
            }
          >
            <textarea
              rows={3}
              className={areaClass}
              placeholder={
                outcome === "passed"
                  ? "e.g. Lovely garden — please keep the side gate latched."
                  : "- Raise the back fence to at least 1.5m\n- Fill the gap beside the gate"
              }
              value={comments}
              onChange={(e) => updateComments(e.target.value)}
            />
          </Field>
          <Field label="Email to the applicant — edit before sending">
            <textarea
              rows={10}
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
        {outcome && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => go(true)}
            className={`h-12 rounded-[var(--radius)] text-white font-bold disabled:opacity-60 ${
              outcome === "passed" ? "bg-ok" : "bg-brand"
            }`}
          >
            {isPending ? "Saving…" : "Record home check & email the applicant"}
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => go(false)}
          className="h-11 rounded-[var(--radius)] border border-line-cool font-semibold disabled:opacity-60"
        >
          Record without emailing
        </button>
      </div>
    </form>
  );
}
