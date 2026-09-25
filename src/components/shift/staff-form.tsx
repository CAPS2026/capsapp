"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addStaffMember,
  removeStaffMember,
  sendLoginInvite,
  updateStaffMember,
  type LoginOutcome,
  type StaffInput,
} from "@/lib/actions/shift-people";
import type { StaffMember, StaffRole } from "@/lib/shift-people-data";

const inputClass = "h-11 w-full rounded-[var(--radius)] border border-line-cool bg-white px-3 text-base";
const areaClass = "w-full rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-base";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

const ROLE_LABEL: Record<StaffRole, string> = {
  staff: "Caretaker: works shifts, shows on the sign-in screen and the roster",
  admin: "Admin: edits the roster, decides leave, manages staff",
  volunteer: "Volunteer: shows as an available walker on the dog side",
};

/** What happened with the login, in plain words. */
function LoginMessage({ login, email }: { login: LoginOutcome; email: string }) {
  if (!login.loginReady) {
    return (
      <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
        Saved, but their login could not be set up ({login.problem}). Try &ldquo;Send login email&rdquo; again later.
      </p>
    );
  }
  return login.emailed ? (
    <p className="m-0 rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-ink">
      Their login is ready and an email telling them how to sign in has gone to {email}.
    </p>
  ) : (
    <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
      Their login is ready, but the email telling them how to sign in did NOT send. Tell them yourself: go to the
      staff app&rsquo;s sign-in page, type {email}, and enter the code they are sent.
    </p>
  );
}

/** Add (no `member`) or edit (with `member`) a staff member. Same fields as
 *  the dog app's Add staff form. */
export function StaffForm({ member, isSelf }: { member?: StaffMember; isSelf?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: member?.firstName ?? "",
    surname: member?.surname ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    dateOfBirth: member?.dateOfBirth ?? "",
    address: member?.address ?? "",
    ecName: member?.ecName ?? "",
    ecPhone: member?.ecPhone ?? "",
    ecRelationship: member?.ecRelationship ?? "",
    ecEmail: member?.ecEmail ?? "",
    medicalIssues: member?.medicalIssues ?? "",
  });
  const [roles, setRoles] = useState<Record<StaffRole, boolean>>(
    member
      ? { staff: member.roles.includes("staff"), admin: member.roles.includes("admin"), volunteer: member.roles.includes("volunteer") }
      : { staff: true, admin: false, volunteer: true },
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [login, setLogin] = useState<LoginOutcome | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(null);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    const input: StaffInput = { ...form, roles };
    startTransition(async () => {
      if (member) {
        const r = await updateStaffMember(member.id, input);
        if (r.error) setError(r.error);
        else {
          setSaved("Saved.");
          router.refresh();
        }
      } else {
        const r = await addStaffMember(input);
        if (r.error !== undefined) setError(r.error);
        else {
          setLogin(r.login);
          setSaved(`${form.firstName.trim()} has been added.`);
        }
      }
    });
  }

  if (!member && saved && login) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-base font-extrabold">{saved}</p>
        <LoginMessage login={login} email={form.email.trim().toLowerCase()} />
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push("/shift/staff")} className="h-11 rounded-[var(--radius)] bg-brand px-5 text-sm font-bold text-white">
            Back to staff
          </button>
        </div>
      </div>
    );
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
        <Field label="Email (how they sign in)">
          <input type="email" inputMode="email" className={inputClass} required value={form.email} onChange={(e) => set("email", e.target.value)} />
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

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1 text-sm font-bold">Emergency contact</legend>
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
        <textarea rows={2} className={areaClass} value={form.medicalIssues} onChange={(e) => set("medicalIssues", e.target.value)} />
      </Field>

      <fieldset className="flex flex-col gap-2 rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1 text-sm font-bold">Roles</legend>
        {(["staff", "admin", "volunteer"] as StaffRole[]).map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={roles[r]}
              disabled={r === "admin" && isSelf}
              onChange={(e) => {
                setRoles((x) => ({ ...x, [r]: e.target.checked }));
                setSaved(null);
              }}
            />
            {ROLE_LABEL[r]}
          </label>
        ))}
      </fieldset>

      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isPending} className="h-12 flex-1 rounded-[var(--radius)] bg-brand font-bold text-white disabled:opacity-60">
          {isPending ? "Saving…" : member ? "Save changes" : "Add staff member"}
        </button>
        <button type="button" onClick={() => router.push("/shift/staff")} className="h-12 rounded-[var(--radius)] border border-line-cool px-5 font-semibold">
          {member ? "Back" : "Cancel"}
        </button>
      </div>
      {saved && <p className="m-0 text-sm font-semibold text-ok">{saved}</p>}
    </form>
  );
}

/** "Send login email" for someone with no login yet, or who needs the
 *  sign-in instructions again. */
export function LoginInviteButton({ id, email, hasLogin }: { id: string; email: string; hasLogin: boolean }) {
  const [login, setLogin] = useState<LoginOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm">
        {hasLogin || login?.loginReady ? "They have a login." : "They don't have a login yet, so they can't sign in on their own phone."}
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await sendLoginInvite(id);
            if (r.error !== undefined) setError(r.error);
            else setLogin(r.login);
          })
        }
        className="h-10 self-start rounded-[var(--radius)] border-[1.5px] border-brand px-4 text-sm font-bold text-brand-ink disabled:opacity-50"
      >
        {isPending ? "Sending…" : hasLogin ? "Send sign-in instructions again" : "Set up login and send email"}
      </button>
      {login && <LoginMessage login={login} email={email} />}
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

/** Remove from the staff app, after showing their future roster slots. */
export function RemoveStaffButton({ id, name, futureSlots }: { id: string; name: string; futureSlots: string[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-10 self-start rounded-[var(--radius)] border-[1.5px] border-danger px-4 text-sm font-bold text-danger"
      >
        Remove {name}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-danger p-3">
      <p className="m-0 text-sm font-extrabold">Remove {name} from the staff app?</p>
      <p className="m-0 text-sm">
        Their Caretaker, Admin and Volunteer roles end and their login is switched off. Their past shifts, ticks and
        leave stay on record.
      </p>
      {futureSlots.length > 0 ? (
        <div className="text-sm">
          <p className="m-0 font-bold text-warm-ink">They are still on the roster for these shifts, which will need someone else:</p>
          <ul className="m-0 list-disc pl-5">
            {futureSlots.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="m-0 text-sm text-ink-muted">They have no future roster shifts.</p>
      )}
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await removeStaffMember(id);
              if (r.error) setError(r.error);
              else router.push("/shift/staff");
            })
          }
          className="h-10 rounded-[var(--radius)] bg-danger px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Removing…" : "Yes, remove"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
