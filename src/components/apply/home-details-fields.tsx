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

const FENCE_TYPES = ["Colorbond / metal", "Timber / paling", "Brick / masonry", "Chain link / wire mesh", "Pool-style fence", "Picket", "Other", "No fence"];
const FENCE_HEIGHTS = ["Under 1 m", "1 – 1.2 m", "1.2 – 1.5 m", "1.5 – 1.8 m", "Over 1.8 m"];
const PEOPLE_AT_HOME: [string, string][] = [
  ...Array.from({ length: 9 }, (_, i): [string, string] => [String(i + 1), String(i + 1)]),
  ["10", "10 or more"],
];
const CHILDREN: [string, string][] = [
  ...Array.from({ length: 5 }, (_, i): [string, string] => [String(i), i === 0 ? "None" : String(i)]),
  ["6", "6 or more"],
];

// A dropdown that keeps any older free-text answer visible as its own option.
function Pick({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | [string, string])[];
}) {
  const pairs = options.map((o): [string, string] => (typeof o === "string" ? [o, o] : o));
  const known = pairs.some(([v]) => v === value);
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose one…</option>
      {pairs.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
      {value && !known && <option value={value}>{value}</option>}
    </select>
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

      <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Your home and garden</legend>
        <Field label="Do you own or rent your property?">
          <select className={inputClass} value={value.propertyOwnership} onChange={(e) => set("propertyOwnership", e.target.value)}>
            <option value="">Choose one…</option>
            <option value="Own">Own</option>
            <option value="Rent">Rent</option>
            {value.propertyOwnership && !["Own", "Rent"].includes(value.propertyOwnership) && (
              <option value={value.propertyOwnership}>{value.propertyOwnership}</option>
            )}
          </select>
          {value.propertyOwnership.toLowerCase().startsWith("rent") && (
            <span className="text-sm text-warm-ink bg-warm-tint rounded-[var(--radius)] p-2">
              If you rent, we&apos;ll need a letter from your landlord confirming that pets are allowed.
            </span>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fence type">
            <Pick value={value.fenceType} onChange={(v) => set("fenceType", v)} options={FENCE_TYPES} />
          </Field>
          <Field label="Fence height">
            <Pick value={value.fenceHeight} onChange={(v) => set("fenceHeight", v)} options={FENCE_HEIGHTS} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="People at home">
            <Pick value={value.peopleAtHome} onChange={(v) => set("peopleAtHome", v)} options={PEOPLE_AT_HOME} />
          </Field>
          <Field label="Children under 16">
            <Pick value={value.childrenU16} onChange={(v) => set("childrenU16", v)} options={CHILDREN} />
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
