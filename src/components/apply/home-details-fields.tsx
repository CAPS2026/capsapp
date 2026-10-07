"use client";

import { EMPTY_PET, type HomeDetails, type Pet, type YesNo } from "@/lib/homecare-form";
import {
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

const inputClass = "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
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
  const childCount = (h: HomeDetails) => {
    const n = parseInt(h.childrenU16, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
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
        <Field label="Ownership type" required>
          <Pick value={value.propertyOwnership} onChange={(v) => set("propertyOwnership", v)} options={OWNERSHIP_TYPES} />
          {value.propertyOwnership.toLowerCase().startsWith("rent") && (
            <span className="text-sm text-warm-ink bg-warm-tint rounded-[var(--radius)] p-2">
              If you rent, fostering needs a copy of your real estate approval. Jail break doesn&apos;t, because the dog is
              visiting rather than living at your home.
            </span>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fence type" required>
            <PickOther value={value.fenceType} onChange={(v) => set("fenceType", v)} options={FENCE_TYPES} />
          </Field>
          <Field label="Fence height" required>
            <PickOther value={value.fenceHeight} onChange={(v) => set("fenceHeight", v)} options={FENCE_HEIGHTS} otherLabel="Please specify (include feet or metres)" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="People at home" required>
            <Pick value={value.peopleAtHome} onChange={(v) => set("peopleAtHome", v)} options={PEOPLE_AT_HOME} />
          </Field>
          <Field label="Children under 16" required>
            <Pick value={value.childrenU16} onChange={(v) => set("childrenU16", v)} options={CHILDREN} />
          </Field>
        </div>
        {childCount(value) > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: childCount(value) }, (_, i) => (
              <Field key={i} label={`Age of child ${i + 1}`} required>
                <Pick
                  value={value.childAges[i] ?? ""}
                  onChange={(v) => {
                    const next = [...value.childAges];
                    while (next.length <= i) next.push("");
                    next[i] = v;
                    set("childAges", next);
                  }}
                  options={CHILD_AGES}
                />
              </Field>
            ))}
          </div>
        )}
        <Field label="Do you have any other animals at home?" required>
          <Pick
            value={value.otherAnimals}
            onChange={(v) => onChange({ ...value, otherAnimals: v, pets: v === "Yes" && value.pets.length === 0 ? [{ ...EMPTY_PET }] : value.pets })}
            options={["Yes", "No"]}
          />
        </Field>
        {value.otherAnimals === "Yes" && (
          <>
            {value.pets.map((p, i) => {
              const setPet = <K extends keyof Pet>(k: K, v: Pet[K]) =>
                set("pets", value.pets.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
              return (
                <fieldset key={i} className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-3">
                  <legend className="text-sm font-bold px-1">Animal {i + 1}</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type of animal" required>
                      <Pick value={p.type} onChange={(v) => setPet("type", v)} options={PET_TYPES} />
                    </Field>
                    <Field label="Breed" required>
                      <input className={inputClass} required value={p.breed} onChange={(e) => setPet("breed", e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Age" required>
                      <input className={inputClass} required placeholder="e.g. 3 years" value={p.age} onChange={(e) => setPet("age", e.target.value)} />
                    </Field>
                    <Field label="Temperament" required>
                      <Pick value={p.temperament} onChange={(v) => setPet("temperament", v)} options={TEMPERAMENTS} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Desexed?" required>
                      <Pick value={p.desexed} onChange={(v) => setPet("desexed", v as YesNo)} options={YES_NO} />
                    </Field>
                    <Field label="Vaccinations and prevention up to date?" required>
                      <Pick value={p.vaccinated} onChange={(v) => setPet("vaccinated", v as YesNo)} options={YES_NO} />
                    </Field>
                  </div>
                  {value.pets.length > 1 && (
                    <button
                      type="button"
                      className="self-start text-sm font-semibold text-ink underline"
                      onClick={() => set("pets", value.pets.filter((_, j) => j !== i))}
                    >
                      Remove animal {i + 1}
                    </button>
                  )}
                </fieldset>
              );
            })}
            <button
              type="button"
              className="self-start h-10 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm font-semibold"
              onClick={() => set("pets", [...value.pets, { ...EMPTY_PET }])}
            >
              + Add another animal
            </button>
          </>
        )}
      </fieldset>
    </>
  );
}
