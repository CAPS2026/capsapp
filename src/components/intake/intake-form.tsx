"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDogIntake } from "@/lib/actions/intake";
import {
  AGE_BANDS,
  BEHAVIOUR_OPTIONS,
  BREED_SUGGESTIONS,
  COAT_LENGTHS,
  COLOURS,
  CONDITIONS,
  EMPTY_INTAKE,
  INTAKE_REASONS,
  INTAKE_SOURCES,
  intakeError,
  SEX_OPTIONS,
  SIZE_OPTIONS,
  SOURCES_WITH_PERSON,
  VACCINE_TYPES,
  YES_NO_UNTESTED,
  type IntakeInput,
  type YN,
} from "@/lib/intake";
import { YES_NO } from "@/lib/home-options";
import { Pick, PickOther } from "@/components/apply/pick";

const inputClass = "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

function Star() {
  return (
    <span className="text-danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">
        {label}
        {required && <Star />}
      </span>
      {children}
      {hint && <span className="text-xs text-ink">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] bg-card p-4">
      <legend className="text-base font-extrabold px-1" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function IntakeForm({ officerName, today }: { officerName: string; today: string }) {
  const [f, setF] = useState<IntakeInput>({ ...EMPTY_INTAKE, intakeDate: today, officerName });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ dogId: string; ref: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const set = <K extends keyof IntakeInput>(k: K, v: IntakeInput[K]) => setF((x) => ({ ...x, [k]: v }));

  function toggleBehaviour(code: string) {
    const has = f.behaviour.includes(code);
    const next = has ? f.behaviour.filter((b) => b !== code) : [...f.behaviour, code];
    setF((x) => ({
      ...x,
      behaviour: next,
      // Aggressive suggests experienced handlers only; staff can untick it.
      experiencedOnly: code === "aggressive" && !has ? true : x.experiencedOnly,
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = intakeError(f);
    if (problem) return setError(problem);
    startTransition(async () => {
      const r = await createDogIntake(f);
      if (!("ok" in r)) return setError(r.error);
      setSaved({ dogId: r.dogId, ref: r.ref, name: f.name.trim() });
    });
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-4 border border-line rounded-[var(--radius)] bg-card p-5">
        <h2 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {saved.name} is in ({saved.ref})
        </h2>
        <p className="text-sm text-ink">The intake record is saved. Photos and the SavourLife listing come next.</p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/dogs/${saved.dogId}`)}
            className="h-12 px-5 rounded-[var(--radius)] bg-brand text-white font-bold"
          >
            Open {saved.name}
          </button>
          <button
            type="button"
            onClick={() => {
              setF({ ...EMPTY_INTAKE, intakeDate: today, officerName });
              setSaved(null);
            }}
            className="h-12 px-5 rounded-[var(--radius)] border border-line-cool font-semibold"
          >
            Take in another dog
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-xs text-ink">
        <span className="text-danger">*</span> means the question must be answered.
      </p>

      <Section title="The dog">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Name" required hint="Match the microchip. Use 'Unknown' plus the date if there isn't one.">
            <input className={inputClass} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Date of intake" required>
            <input type="date" className={inputClass} value={f.intakeDate} onChange={(e) => set("intakeDate", e.target.value)} />
          </Field>
          <Field label="Microchip number">
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.microchip}
              onChange={(e) => set("microchip", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Breed" required hint="Pick a suggestion or type your own.">
            <input
              list="breed-suggestions"
              className={inputClass}
              value={f.breed}
              onChange={(e) => set("breed", e.target.value)}
            />
            <datalist id="breed-suggestions">
              {BREED_SUGGESTIONS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
          <Field label="Sex" required>
            <Pick value={f.sex} onChange={(v) => set("sex", v)} options={SEX_OPTIONS} />
          </Field>
          <Field label="Desexed?" required>
            <Pick value={f.desexed} onChange={(v) => set("desexed", v as YN)} options={YES_NO} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Date of birth" required hint="Leave blank and pick an approximate age if unknown.">
            <input
              type="date"
              className={inputClass}
              value={f.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Approximate age">
            <Pick
              value={f.ageBand}
              onChange={(v) => set("ageBand", v)}
              options={AGE_BANDS.map(([k, label]): [string, string] => [k, label])}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              className={inputClass}
              value={f.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Colour">
            <PickOther value={f.colour} onChange={(v) => set("colour", v)} options={COLOURS} />
          </Field>
          <Field label="Markings">
            <input
              className={inputClass}
              placeholder="e.g. white chest, one blue eye"
              value={f.markings}
              onChange={(e) => set("markings", e.target.value)}
            />
          </Field>
          <Field label="Coat length">
            <Pick value={f.coatLength} onChange={(v) => set("coatLength", v)} options={COAT_LENGTHS} />
          </Field>
          <Field label="Size when adult">
            <Pick value={f.sizeWhenAdult} onChange={(v) => set("sizeWhenAdult", v)} options={SIZE_OPTIONS} />
          </Field>
        </div>
      </Section>

      <Section title="How the dog arrived">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Source of intake" required>
            <Pick value={f.source} onChange={(v) => set("source", v)} options={INTAKE_SOURCES} />
          </Field>
          {SOURCES_WITH_PERSON.includes(f.source) && (
            <Field label="Surrendered by">
              <input
                className={inputClass}
                placeholder="Name and phone"
                value={f.surrenderedBy}
                onChange={(e) => set("surrenderedBy", e.target.value)}
              />
            </Field>
          )}
          <Field label="Reason for intake" required>
            <Pick value={f.reason} onChange={(v) => set("reason", v)} options={INTAKE_REASONS} />
          </Field>
          <Field label="More about the reason" hint="Optional.">
            <input className={inputClass} value={f.reasonNote} onChange={(e) => set("reasonNote", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Initial health check">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Condition" required>
            <Pick value={f.condition} onChange={(v) => set("condition", v)} options={CONDITIONS} />
          </Field>
          <Field label="Parasites observed?" required>
            <Pick value={f.parasites} onChange={(v) => set("parasites", v as YN)} options={YES_NO} />
          </Field>
          <Field label="Visible injuries or illness" hint="Leave blank if none.">
            <input
              className={inputClass}
              value={f.visibleInjuries}
              onChange={(e) => set("visibleInjuries", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Vaccination given?" required>
            <Pick value={f.vaccinationGiven} onChange={(v) => set("vaccinationGiven", v as YN)} options={YES_NO} />
          </Field>
          {f.vaccinationGiven === "yes" && (
            <Field label="Vaccination type" required>
              <Pick value={f.vaccinationType} onChange={(v) => set("vaccinationType", v)} options={VACCINE_TYPES} />
            </Field>
          )}
          <Field label="Flea / tick / worm treatment given?" required>
            <Pick value={f.fleaTickWormGiven} onChange={(v) => set("fleaTickWormGiven", v as YN)} options={YES_NO} />
          </Field>
        </div>
      </Section>

      <Section title="Initial behaviour assessment">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="text-sm font-semibold mb-1">
            Tick all that apply
            <Star />
          </legend>
          {BEHAVIOUR_OPTIONS.map(([code, label]) => (
            <label
              key={code}
              className={`flex items-center gap-2 text-sm px-4 h-11 rounded-[var(--radius)] border cursor-pointer ${
                f.behaviour.includes(code) ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
              }`}
            >
              <input type="checkbox" checked={f.behaviour.includes(code)} onChange={() => toggleBehaviour(code)} />
              {label}
            </label>
          ))}
        </fieldset>
        {f.behaviour.includes("other") && (
          <Field label="What other behaviour?" required>
            <input className={inputClass} value={f.behaviourOther} onChange={(e) => set("behaviourOther", e.target.value)} />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.experiencedOnly}
            onChange={(e) => set("experiencedOnly", e.target.checked)}
          />
          Experienced handlers only (volunteers will see this on the dog)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Kids under 5">
            <Pick value={f.goodWithKidsU5} onChange={(v) => set("goodWithKidsU5", v)} options={YES_NO_UNTESTED} />
          </Field>
          <Field label="Kids 5 to 12">
            <Pick value={f.goodWithKids5to12} onChange={(v) => set("goodWithKids5to12", v)} options={YES_NO_UNTESTED} />
          </Field>
          <Field label="Other cats">
            <Pick value={f.goodWithCats} onChange={(v) => set("goodWithCats", v)} options={YES_NO_UNTESTED} />
          </Field>
          <Field label="Other dogs">
            <Pick value={f.goodWithDogs} onChange={(v) => set("goodWithDogs", v)} options={YES_NO_UNTESTED} />
          </Field>
        </div>
      </Section>

      <Section title="Notes and sign-off">
        <Field label="Notes">
          <textarea rows={3} className={areaClass} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.startOnBedRest} onChange={(e) => set("startOnBedRest", e.target.checked)} />
          Start on bed rest (not ready for walks yet)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Intake officer / volunteer">
            <input className={inputClass} value={f.officerName} onChange={(e) => set("officerName", e.target.value)} />
          </Field>
          <Field label="Type your name to sign" required>
            <input className={inputClass} value={f.signedName} onChange={(e) => set("signedName", e.target.value)} />
          </Field>
        </div>
      </Section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save intake"}
      </button>
    </form>
  );
}
