"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePerson } from "@/lib/actions/people";
import type { PersonDetail } from "@/lib/person-detail";

const inputClass =
  "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function EditPersonForm({ person }: { person: PersonDetail }) {
  const [form, setForm] = useState({
    firstName: person.firstName,
    surname: person.surname,
    nickname: person.nickname ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    dateOfBirth: person.dateOfBirth ?? "",
    address: person.address ?? "",
    ecName: person.ec.name ?? "",
    ecPhone: person.ec.phone ?? "",
    ecRelationship: person.ec.relationship ?? "",
    ecEmail: person.ec.email ?? "",
    parentName: person.parent.name ?? "",
    parentPhone: person.parent.phone ?? "",
    parentEmail: person.parent.email ?? "",
    notesInternal: person.notesInternal ?? "",
  });
  const [parentalConsent, setParentalConsent] = useState(person.parent.consent);
  const [imageConsent, setImageConsent] = useState<"" | "yes" | "no">(
    person.imageConsent == null ? "" : person.imageConsent ? "yes" : "no",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const showParent = person.isMinor || !!(form.parentName || form.parentPhone || form.parentEmail);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updatePerson(person.id, {
        ...form,
        parentalConsent,
        imageConsent: imageConsent === "yes" ? true : imageConsent === "no" ? false : null,
      });
      if (r.error) setError(r.error);
      else router.push(`/people/${person.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input className={inputClass} required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Surname">
          <input className={inputClass} required value={form.surname} onChange={(e) => set("surname", e.target.value)} />
        </Field>
      </div>

      <Field label="Nickname">
        <input className={inputClass} value={form.nickname} onChange={(e) => set("nickname", e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input type="email" inputMode="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input type="tel" inputMode="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth">
          <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label="Address">
          <input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Emergency contact</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input className={inputClass} value={form.ecName} onChange={(e) => set("ecName", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input type="tel" className={inputClass} value={form.ecPhone} onChange={(e) => set("ecPhone", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Relationship">
            <input className={inputClass} value={form.ecRelationship} onChange={(e) => set("ecRelationship", e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClass} value={form.ecEmail} onChange={(e) => set("ecEmail", e.target.value)} />
          </Field>
        </div>
      </fieldset>

      {showParent && (
        <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-4">
          <legend className="text-sm font-bold px-1">Parent / guardian</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputClass} value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input type="tel" className={inputClass} value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" className={inputClass} value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={parentalConsent} onChange={(e) => setParentalConsent(e.target.checked)} />
            Parental / guardian consent confirmed
          </label>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Promotional image consent</legend>
        <div className="flex gap-2">
          {(
            [
              ["", "Not asked"],
              ["yes", "Yes"],
              ["no", "No"],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v || "none"}
              className={`flex-1 flex items-center justify-center gap-2 text-sm h-11 rounded-[var(--radius)] border cursor-pointer ${
                imageConsent === v ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
              }`}
            >
              <input type="radio" name="imageConsent" checked={imageConsent === v} onChange={() => setImageConsent(v)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Staff notes">
        <textarea
          rows={3}
          className={areaClass}
          value={form.notesInternal}
          onChange={(e) => set("notesInternal", e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-12 flex-1 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/people/${person.id}`)}
          className="h-12 px-5 rounded-[var(--radius)] border border-line-cool font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
