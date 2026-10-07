"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDogIntake } from "@/lib/actions/intake";
import {
  AGE_BANDS,
  AU_STATES,
  BEHAVIOUR_OPTIONS,
  BREED_SUGGESTIONS,
  COAT_LENGTHS,
  COLOURS,
  CONDITIONS,
  DISTANCE_OPTIONS,
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

// Orange tag on every question SavourLife also asks, so staff can see which answers
// are sent to (or pasted into) their listing.
function SL() {
  return (
    <span
      title="This is captured for SavourLife"
      className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-warm text-ink align-middle"
    >
      SL
    </span>
  );
}

function Field({
  label,
  required,
  sl,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  sl?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">
        {label}
        {required && <Star />}
        {sl && <SL />}
      </span>
      {children}
      {hint && <span className="text-xs text-ink">{hint}</span>}
    </label>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] bg-card p-4">
      <legend className="text-base font-extrabold px-1" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </legend>
      {note && <p className="text-xs text-ink -mt-1">{note}</p>}
      {children}
    </fieldset>
  );
}

export function IntakeForm({ officerName, today }: { officerName: string; today: string }) {
  // The sign-off is filled from whoever is signed in (an admin); they can still edit it before saving.
  const start: IntakeInput = { ...EMPTY_INTAKE, intakeDate: today, officerName, signedName: officerName };
  const [f, setF] = useState<IntakeInput>(start);
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
        <p className="text-sm text-ink">
          The intake record is saved and signed. Photos and the SavourLife listing come next. Staff and admin can see
          every detail on the dog&apos;s page; volunteers see only the essentials.
        </p>
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
              setF(start);
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
        <span className="text-danger">*</span> means the question must be answered. <SL /> marks everything SavourLife also
        asks for, in the order their form uses.
      </p>

      <Section
        title="SavourLife profile"
        note="Everything in this box is captured for the SavourLife listing, in their order."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Name" required sl hint="Match the microchip. Use 'Unknown' plus the date if there isn't one.">
            <input className={inputClass} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Breed" required sl hint="Pick a suggestion or type your own.">
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
          <Field label="Sex" required sl>
            <Pick value={f.sex} onChange={(v) => set("sex", v)} options={SEX_OPTIONS} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Date of birth" required sl hint="Leave blank and pick an approximate age if unknown.">
            <input
              type="date"
              className={inputClass}
              value={f.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Approximate age" sl>
            <Pick
              value={f.ageBand}
              onChange={(v) => set("ageBand", v)}
              options={AGE_BANDS.map(([k, label]): [string, string] => [k, label])}
            />
          </Field>
          <Field label="Size when adult" sl>
            <Pick value={f.sizeWhenAdult} onChange={(v) => set("sizeWhenAdult", v)} options={SIZE_OPTIONS} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Coat length" sl>
            <Pick value={f.coatLength} onChange={(v) => set("coatLength", v)} options={COAT_LENGTHS} />
          </Field>
          <Field label="Microchip number" sl>
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.microchip}
              onChange={(e) => set("microchip", e.target.value)}
            />
          </Field>
          <Field label="Foster / case manager email" sl hint="Gets the enquiries. Never shown publicly.">
            <input
              type="email"
              inputMode="email"
              className={inputClass}
              value={f.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Profile — personality and best features"
          sl
          hint="The more detail, the more enquiries. Leave it for now and add it later if you don't know the dog yet."
        >
          <textarea rows={4} className={areaClass} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-1">
            Can they be re-homed with…
            <SL />
          </legend>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            <Field label="Other animals">
              <Pick value={f.goodWithOther} onChange={(v) => set("goodWithOther", v)} options={YES_NO_UNTESTED} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-1">
            Medical — tick what will be true at the time of adoption
            <SL />
          </legend>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Desexed" required>
              <Pick value={f.desexed} onChange={(v) => set("desexed", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Vaccinated">
              <Pick value={f.vaccinated} onChange={(v) => set("vaccinated", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Wormed">
              <Pick value={f.wormed} onChange={(v) => set("wormed", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Heart wormed">
              <Pick value={f.heartworm} onChange={(v) => set("heartworm", v as YN)} options={YES_NO} />
            </Field>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Medical issues" sl hint="Anything an adopter should know. Leave blank if none.">
            <input className={inputClass} value={f.medicalIssues} onChange={(e) => set("medicalIssues", e.target.value)} />
          </Field>
          <Field label="Special needs" sl hint="Diet, medication, equipment. Leave blank if none.">
            <input className={inputClass} value={f.specialNeeds} onChange={(e) => set("specialNeeds", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Indoor only?" sl>
            <Pick value={f.indoorOnly} onChange={(v) => set("indoorOnly", v as YN)} options={YES_NO} />
          </Field>
          <Field label="Bonded pair?" sl>
            <Pick value={f.bondedPair} onChange={(v) => set("bondedPair", v as YN)} options={YES_NO} />
          </Field>
          {f.bondedPair === "yes" && (
            <Field label="Bonded with" required sl>
              <input className={inputClass} value={f.bondedPairName} onChange={(e) => set("bondedPairName", e.target.value)} />
            </Field>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-1">
            Location
            <SL />
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Suburb">
              <input className={inputClass} value={f.suburb} onChange={(e) => set("suburb", e.target.value)} />
            </Field>
            <Field label="State">
              <Pick value={f.state} onChange={(v) => set("state", v)} options={AU_STATES} />
            </Field>
            <Field label="Postcode" required>
              <input
                inputMode="numeric"
                className={inputClass}
                value={f.postcode}
                onChange={(e) => set("postcode", e.target.value)}
              />
            </Field>
            <Field label="Distance restriction">
              <Pick value={f.distance} onChange={(v) => set("distance", v)} options={DISTANCE_OPTIONS} />
            </Field>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Adoption fee ($)" required sl hint="SavourLife needs one — enter 0 if none.">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={inputClass}
              value={f.adoptionFee}
              onChange={(e) => set("adoptionFee", e.target.value)}
            />
          </Field>
          <Field label="Interstate adoption available?" sl>
            <Pick value={f.interstate} onChange={(v) => set("interstate", v as YN)} options={YES_NO} />
          </Field>
          <Field label="Foster carer required?" sl>
            <Pick value={f.fosterRequired} onChange={(v) => set("fosterRequired", v as YN)} options={YES_NO} />
          </Field>
        </div>
      </Section>

      <Section title="CAPS intake record" note="From the paper Animal Intake Record. Only staff and admin see this.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Date of intake" required>
            <input type="date" className={inputClass} value={f.intakeDate} onChange={(e) => set("intakeDate", e.target.value)} />
          </Field>
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

        <h3 className="text-sm font-extrabold pt-1">Initial health check</h3>
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
          <Field label="Vaccination given at intake?" required>
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

        <h3 className="text-sm font-extrabold pt-1">Initial behaviour assessment</h3>
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.startOnBedRest} onChange={(e) => set("startOnBedRest", e.target.checked)} />
          Start on bed rest (not ready for walks yet)
        </label>

        <Field label="Notes">
          <textarea rows={3} className={areaClass} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </Section>

      <Section
        title="Sign-off"
        note="Completed by an admin. Filled in from your sign-in; change it only if someone else did the intake."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Intake officer">
            <input className={inputClass} value={f.officerName} onChange={(e) => set("officerName", e.target.value)} />
          </Field>
          <Field label="Signed (typed name)" required>
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
