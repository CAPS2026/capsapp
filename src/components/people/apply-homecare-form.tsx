"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyForHomecare } from "@/lib/actions/homecare-apply";

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

// Staff-started homecare application for someone already registered. Their
// details (contact, emergency contact, experience) are already on file, so
// this only asks for what's specific to hosting a dog. Approval then runs
// the normal route: jail break by the emailed one-click link, foster after
// a passing home check.
export function ApplyHomecareForm({
  personId,
  personName,
  hasEmail,
  alreadyJailBreak,
  alreadyFoster,
  initialProgram,
}: {
  personId: string;
  personName: string;
  hasEmail: boolean;
  alreadyJailBreak: boolean;
  alreadyFoster: boolean;
  initialProgram: "jail_break" | "foster" | null;
}) {
  const [jailBreak, setJailBreak] = useState(initialProgram === "jail_break");
  const [foster, setFoster] = useState(initialProgram === "foster");
  const [f, setF] = useState({
    propertyOwnership: "",
    fenceType: "",
    fenceHeight: "",
    peopleAtHome: "",
    childrenU16: "",
    otherAnimals: "",
    animalDetails: "",
    signatureName: "",
  });
  const [vaccines, setVaccines] = useState<"" | "yes" | "no">("");
  const [jb, setJb] = useState({ day: false, weekend: false, shift: false, school: false });
  const [fs, setFs] = useState({ short: false, long: false });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof f, v: string) => setF((cur) => ({ ...cur, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await applyForHomecare({
        personId,
        jailBreak,
        foster,
        ...f,
        vaccinesCurrent: vaccines === "" ? null : vaccines === "yes",
        jbDay: jb.day,
        jbWeekend: jb.weekend,
        jbShift: jb.shift,
        jbSchool: jb.school,
        fosterShort: fs.short,
        fosterLong: fs.long,
        agreeTerms: agree,
      });
      if (r.error) setError(r.error);
      else router.push(`/people/${personId}`);
    });
  }

  if (!hasEmail) {
    return (
      <p className="text-sm text-danger">
        {personName} has no email address on file. Add one first (Edit) — approval is done by email.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-ink">
        For {personName}. Their contact details and experience are already on file. They stay{" "}
        <strong>pending</strong> until approved — jail break by the emailed link, foster after a home check.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Which program?</legend>
        {!alreadyJailBreak && <Check label="Jail break" checked={jailBreak} onChange={setJailBreak} />}
        {!alreadyFoster && <Check label="Foster" checked={foster} onChange={setFoster} />}
        {alreadyJailBreak && <p className="text-xs text-ink">Already has a jail break carer role.</p>}
        {alreadyFoster && <p className="text-xs text-ink">Already has a foster carer role.</p>}
      </fieldset>

      {jailBreak && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold">Jail break availability</legend>
          <Check label="Day" checked={jb.day} onChange={(v) => setJb((c) => ({ ...c, day: v }))} />
          <Check label="Weekend" checked={jb.weekend} onChange={(v) => setJb((c) => ({ ...c, weekend: v }))} />
          <Check label="Shift" checked={jb.shift} onChange={(v) => setJb((c) => ({ ...c, shift: v }))} />
          <Check label="School holidays" checked={jb.school} onChange={(v) => setJb((c) => ({ ...c, school: v }))} />
        </fieldset>
      )}

      {foster && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold">Foster length</legend>
          <Check label="Short term" checked={fs.short} onChange={(v) => setFs((c) => ({ ...c, short: v }))} />
          <Check label="Long term" checked={fs.long} onChange={(v) => setFs((c) => ({ ...c, long: v }))} />
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Their home</legend>
        <Field label="Own or rent?">
          <input
            className={inputClass}
            value={f.propertyOwnership}
            onChange={(e) => set("propertyOwnership", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fence type">
            <input className={inputClass} value={f.fenceType} onChange={(e) => set("fenceType", e.target.value)} />
          </Field>
          <Field label="Fence height">
            <input className={inputClass} value={f.fenceHeight} onChange={(e) => set("fenceHeight", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="People at home">
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.peopleAtHome}
              onChange={(e) => set("peopleAtHome", e.target.value)}
            />
          </Field>
          <Field label="Children under 16">
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.childrenU16}
              onChange={(e) => set("childrenU16", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Other animals">
          <input className={inputClass} value={f.otherAnimals} onChange={(e) => set("otherAnimals", e.target.value)} />
        </Field>
        <Field label="Animal details (vaccinated, desexed…)">
          <input className={inputClass} value={f.animalDetails} onChange={(e) => set("animalDetails", e.target.value)} />
        </Field>
        <Field label="Other animals' vaccinations up to date?">
          <select
            className={inputClass}
            value={vaccines}
            onChange={(e) => setVaccines(e.target.value as "" | "yes" | "no")}
          >
            <option value="">Not sure / none</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>The applicant has read and agrees to the CAPS homecare terms.</span>
      </label>
      <Field label="Applicant types their full name to sign">
        <input
          className={inputClass}
          required
          value={f.signatureName}
          onChange={(e) => set("signatureName", e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
