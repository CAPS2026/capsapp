"use client";

import type { HomeDetails } from "@/lib/homecare-form";

const inputClass = "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// The garden / home part of a homecare application, plus the availability
// questions for whichever program(s) were picked. Nothing personal — that's
// already on the volunteer registration.
export function HomeDetailsFields({
  value,
  onChange,
  jailBreak,
  foster,
}: {
  value: HomeDetails;
  onChange: (next: HomeDetails) => void;
  jailBreak: boolean;
  foster: boolean;
}) {
  const set = <K extends keyof HomeDetails>(k: K, v: HomeDetails[K]) => onChange({ ...value, [k]: v });

  return (
    <>
      {jailBreak && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold">Jail break availability</legend>
          <Check label="Day" checked={value.jbDay} onChange={(v) => set("jbDay", v)} />
          <Check label="Weekend" checked={value.jbWeekend} onChange={(v) => set("jbWeekend", v)} />
          <Check label="Shift" checked={value.jbShift} onChange={(v) => set("jbShift", v)} />
          <Check label="School holidays" checked={value.jbSchool} onChange={(v) => set("jbSchool", v)} />
        </fieldset>
      )}

      {foster && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold">Foster length</legend>
          <Check label="Short term" checked={value.fosterShort} onChange={(v) => set("fosterShort", v)} />
          <Check label="Long term" checked={value.fosterLong} onChange={(v) => set("fosterLong", v)} />
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Your home and garden</legend>
        <Field label="Own or rent?">
          <input className={inputClass} value={value.propertyOwnership} onChange={(e) => set("propertyOwnership", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fence type">
            <input className={inputClass} value={value.fenceType} onChange={(e) => set("fenceType", e.target.value)} />
          </Field>
          <Field label="Fence height">
            <input className={inputClass} value={value.fenceHeight} onChange={(e) => set("fenceHeight", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="People at home">
            <input inputMode="numeric" className={inputClass} value={value.peopleAtHome} onChange={(e) => set("peopleAtHome", e.target.value)} />
          </Field>
          <Field label="Children under 16">
            <input inputMode="numeric" className={inputClass} value={value.childrenU16} onChange={(e) => set("childrenU16", e.target.value)} />
          </Field>
        </div>
        <Field label="Other animals">
          <input className={inputClass} value={value.otherAnimals} onChange={(e) => set("otherAnimals", e.target.value)} />
        </Field>
        <Field label="Animal details (vaccinated, desexed…)">
          <input className={inputClass} value={value.animalDetails} onChange={(e) => set("animalDetails", e.target.value)} />
        </Field>
        <Field label="Other animals' vaccinations up to date?">
          <select className={inputClass} value={value.vaccines} onChange={(e) => set("vaccines", e.target.value as HomeDetails["vaccines"])}>
            <option value="">Not sure / none</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </fieldset>
    </>
  );
}
