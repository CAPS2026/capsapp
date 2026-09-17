"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaffMember } from "@/lib/actions/people";

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

export function AddStaffForm() {
  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    ecName: "",
    ecPhone: "",
    ecRelationship: "",
    ecEmail: "",
    medicalIssues: "",
  });
  const [roles, setRoles] = useState({ staff: true, admin: false, volunteer: true });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createStaffMember({ ...form, roles });
      if (r.error) setError(r.error);
      else router.push("/shift/roster");
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input
            type="email"
            inputMode="email"
            className={inputClass}
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
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

      <Field label="Medical issues (if any)">
        <textarea
          rows={2}
          className={areaClass}
          value={form.medicalIssues}
          onChange={(e) => set("medicalIssues", e.target.value)}
          placeholder="Anything staff should know before they're out with a dog"
        />
      </Field>

      <fieldset className="flex flex-col gap-2 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Roles</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={roles.staff}
            onChange={(e) => setRoles((r) => ({ ...r, staff: e.target.checked }))}
          />
          Staff — access to the Staff area, People, Logs, Reports
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={roles.admin}
            onChange={(e) => setRoles((r) => ({ ...r, admin: e.target.checked }))}
          />
          Admin — plus deletes, merges, café-mode PIN, this Add Staff page
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={roles.volunteer}
            onChange={(e) => setRoles((r) => ({ ...r, volunteer: e.target.checked }))}
          />
          Volunteer — shows up as an available walker on the Dogs side
        </label>
        <p className="text-xs text-ink-muted pt-1">
          Jail break / foster carer aren&rsquo;t grantable here — those need a home visit and yard
          check first, so they still go through the normal apply-and-approve flow.
        </p>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-12 flex-1 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add staff member"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/shift/roster")}
          className="h-12 px-5 rounded-[var(--radius)] border border-line-cool font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
