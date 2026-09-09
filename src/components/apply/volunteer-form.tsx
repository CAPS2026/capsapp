"use client";

import { useState, useTransition } from "react";
import { registerVolunteer } from "@/lib/actions/registration";
import {
  ageFromDob,
  VOLUNTEER_INTERESTS,
  HOW_HEARD_OPTIONS,
  type RegisterResult,
} from "@/lib/registration";
import { VOLUNTEER_TERMS } from "@/lib/terms";

const inputClass =
  "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function VolunteerForm() {
  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    nickname: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    ecName: "",
    ecPhone: "",
    ecRelationship: "",
    ecEmail: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentalConsent: false,
    experience: "",
    medicalIssues: "",
    howHeard: "",
    howHeardOther: "",
    agreeTerms: false,
    signatureName: "",
    website: "", // honeypot
  });
  const [under18, setUnder18] = useState<"" | "no" | "yes">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [homecareInterest, setHomecareInterest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"active" | "pending" | null>(null);
  const [isPending, startTransition] = useTransition();

  const dobAge = form.dateOfBirth ? ageFromDob(form.dateOfBirth) : null;
  const isMinor = under18 === "yes" || (dobAge !== null && dobAge < 18);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleInterest = (code: string) =>
    setInterests((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!under18) {
      setError("Please tell us whether you're under 18.");
      return;
    }
    startTransition(async () => {
      const result: RegisterResult = await registerVolunteer({
        ...form,
        under18: under18 === "yes",
        interests,
        homecareInterest,
      });
      if (result.ok) setDone(result.status);
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {done === "active" ? "You're registered" : "Thanks — we've got your registration"}
        </h2>
        {done === "active" ? (
          <p>
            You can start helping with dog walking straight away. Next time you&apos;re at the
            shelter, check in with a caretaker and they&apos;ll set you up with a dog.
          </p>
        ) : (
          <p>
            Because you&apos;re under 18, someone from CAPS needs to confirm your parent or
            guardian&apos;s consent before you can start. We&apos;ll be in touch.
          </p>
        )}
        {homecareInterest && (
          <p className="text-ink-muted">
            You also said you&apos;re interested in homecare (fostering / jail break) — that has
            its own approval process, and CAPS will contact you about it separately.
          </p>
        )}
        <p className="text-ink-muted">You can close this page now.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input
            className={inputClass}
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </Field>
        <Field label="Surname">
          <input
            className={inputClass}
            required
            autoComplete="family-name"
            value={form.surname}
            onChange={(e) => set("surname", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Nickname" hint="Optional — what people usually call you.">
        <input
          className={inputClass}
          autoComplete="nickname"
          value={form.nickname}
          onChange={(e) => set("nickname", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Phone" hint="e.g. 0400 123 456">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={inputClass}
            required
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth">
          <input
            type="date"
            autoComplete="bday"
            className={inputClass}
            required
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
          />
        </Field>
        <Field label="Address" hint="Optional.">
          <input
            className={inputClass}
            autoComplete="street-address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Are you under 18?</legend>
        <div className="flex gap-2">
          {(
            [
              ["no", "18 or over"],
              ["yes", "Under 18"],
            ] as const
          ).map(([val, label]) => (
            <label
              key={val}
              className={`flex-1 flex items-center justify-center gap-2 text-sm h-11 rounded-[var(--radius)] border cursor-pointer ${
                under18 === val ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
              }`}
            >
              <input
                type="radio"
                name="under18"
                checked={under18 === val}
                onChange={() => setUnder18(val)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Emergency contact</legend>
        <p className="text-xs text-ink-muted">
          Someone we can call if there&apos;s a problem while you&apos;re out with a dog.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              className={inputClass}
              required
              value={form.ecName}
              onChange={(e) => set("ecName", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              inputMode="tel"
              className={inputClass}
              required
              value={form.ecPhone}
              onChange={(e) => set("ecPhone", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Relationship" hint="e.g. partner, parent, friend.">
            <input
              className={inputClass}
              value={form.ecRelationship}
              onChange={(e) => set("ecRelationship", e.target.value)}
            />
          </Field>
          <Field label="Email" hint="Optional.">
            <input
              type="email"
              inputMode="email"
              className={inputClass}
              value={form.ecEmail}
              onChange={(e) => set("ecEmail", e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {isMinor && (
        <fieldset className="flex flex-col gap-3 border border-warm rounded-[var(--radius)] p-4 bg-warm-tint">
          <legend className="text-sm font-bold px-1">Parent or guardian</legend>
          <p className="text-xs text-warm-ink">
            You&apos;re under 18, so a parent or guardian must consent. CAPS will confirm this
            before you can start.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parent / guardian name">
              <input
                className={inputClass}
                required
                value={form.parentName}
                onChange={(e) => set("parentName", e.target.value)}
              />
            </Field>
            <Field label="Parent / guardian phone">
              <input
                type="tel"
                inputMode="tel"
                className={inputClass}
                required
                value={form.parentPhone}
                onChange={(e) => set("parentPhone", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Parent / guardian email" hint="Optional.">
            <input
              type="email"
              inputMode="email"
              className={inputClass}
              value={form.parentEmail}
              onChange={(e) => set("parentEmail", e.target.value)}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.parentalConsent}
              onChange={(e) => set("parentalConsent", e.target.checked)}
            />
            <span>
              I am the parent or guardian named above and I consent to this person volunteering
              with CAPS.
            </span>
          </label>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">What would you like to help with?</legend>
        <div className="grid grid-cols-2 gap-2">
          {VOLUNTEER_INTERESTS.map((i) => (
            <label
              key={i.code}
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-[var(--radius)] border cursor-pointer ${
                interests.includes(i.code) ? "border-brand bg-brand-tint" : "border-line-cool"
              }`}
            >
              <input
                type="checkbox"
                checked={interests.includes(i.code)}
                onChange={() => toggleInterest(i.code)}
              />
              {i.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2 border border-line rounded-[var(--radius)] p-4">
        <legend className="text-sm font-bold px-1">Homecare</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={homecareInterest}
            onChange={(e) => setHomecareInterest(e.target.checked)}
          />
          <span>I&apos;m interested in homecare — fostering a dog or the jail break program.</span>
        </label>
        <p className="text-xs text-ink-muted">
          Homecare has its own approval process (a chat for jail break, a home visit for
          fostering). Ticking this just registers your interest — CAPS will contact you about
          the next steps.
        </p>
      </fieldset>

      <Field label="Any experience with dogs?" hint="Optional.">
        <textarea
          rows={2}
          className={areaClass}
          value={form.experience}
          onChange={(e) => set("experience", e.target.value)}
        />
      </Field>

      <Field
        label="Any medical conditions we should know about?"
        hint="Optional — only what matters if you're out walking a dog (e.g. asthma, a bad back)."
      >
        <textarea
          rows={2}
          className={areaClass}
          value={form.medicalIssues}
          onChange={(e) => set("medicalIssues", e.target.value)}
        />
      </Field>

      <Field label="How did you hear about us?">
        <select
          className={inputClass}
          value={form.howHeard}
          onChange={(e) => set("howHeard", e.target.value)}
        >
          <option value="">Choose one…</option>
          {HOW_HEARD_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      {form.howHeard === "other" && (
        <Field label="Tell us how">
          <input
            className={inputClass}
            value={form.howHeardOther}
            onChange={(e) => set("howHeardOther", e.target.value)}
          />
        </Field>
      )}

      <details className="text-sm border border-line rounded-[var(--radius)] p-3">
        <summary className="font-semibold cursor-pointer">Read the volunteer terms</summary>
        <p className="mt-2 whitespace-pre-wrap text-ink-muted">{VOLUNTEER_TERMS}</p>
      </details>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.agreeTerms}
          onChange={(e) => set("agreeTerms", e.target.checked)}
        />
        <span>I have read and agree to CAPS&apos;s volunteer terms.</span>
      </label>

      <Field label="Type your name to sign">
        <input
          className={inputClass}
          required
          value={form.signatureName}
          onChange={(e) => set("signatureName", e.target.value)}
        />
      </Field>

      {/* Honeypot: hidden from people, catnip for bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
      >
        {isPending ? "Registering…" : "Register"}
      </button>
    </form>
  );
}
