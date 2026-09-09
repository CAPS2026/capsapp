"use client";

import { useState, useTransition } from "react";
import { registerVolunteer } from "@/lib/actions/registration";
import {
  ageFromDob,
  VOLUNTEER_INTERESTS,
  EXPERIENCE_OPTIONS,
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

// A stacked radio group rendered as tappable rows.
function RadioRows({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  options: { code: string; label: string }[];
  value: string;
  onChange: (code: string) => void;
  name: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-bold">{legend}</legend>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <label
            key={o.code}
            className={`flex items-start gap-2 text-sm px-3 py-2 rounded-[var(--radius)] border cursor-pointer ${
              value === o.code ? "border-brand bg-brand-tint" : "border-line-cool"
            }`}
          >
            <input
              type="radio"
              name={name}
              className="mt-0.5"
              checked={value === o.code}
              onChange={() => onChange(o.code)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
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
    experienceLevel: "",
    experienceOther: "",
    medicalIssues: "",
    howHeard: "",
    howHeardOther: "",
    signatureName: "",
    website: "", // honeypot
  });
  const [over18, setOver18] = useState<"" | "yes" | "no">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [fosterInterest, setFosterInterest] = useState(false);
  const [jailBreakInterest, setJailBreakInterest] = useState(false);
  const [imageConsent, setImageConsent] = useState<"" | "yes" | "no">("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"active" | "pending" | null>(null);
  const [isPending, startTransition] = useTransition();

  const dobAge = form.dateOfBirth ? ageFromDob(form.dateOfBirth) : null;
  const isMinor = over18 === "no" || (dobAge !== null && dobAge < 18);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleInterest = (code: string) =>
    setInterests((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!over18) {
      setError("Please tell us whether you're 18 or over.");
      return;
    }
    if (!imageConsent) {
      setError("Please answer the promotional-image consent question.");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the volunteer terms to continue.");
      return;
    }
    startTransition(async () => {
      const result: RegisterResult = await registerVolunteer({
        ...form,
        over18: over18 === "yes",
        interests,
        fosterInterest,
        jailBreakInterest,
        imageConsent: imageConsent === "yes",
        agreeTerms,
      });
      if (result.ok) setDone(result.status);
      else setError(result.error);
    });
  }

  if (done) {
    const homecareLine = [fosterInterest && "fostering", jailBreakInterest && "the jail break program"]
      .filter(Boolean)
      .join(" and ");
    const onSiteActiveNow = interests.length > 0 && done === "active";
    const onSitePending = interests.length > 0 && done === "pending";
    return (
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {onSiteActiveNow ? "You're registered" : "Thanks — we've got your registration"}
        </h2>

        {onSiteActiveNow && (
          <p>
            You can start helping with dog walking straight away. Next time you&apos;re at the
            shelter, check in with a caretaker and they&apos;ll set you up with a dog.
          </p>
        )}
        {onSitePending && (
          <p>
            Because you&apos;re under 18, someone from CAPS needs to confirm your parent or
            guardian&apos;s consent before you can start on-site. We&apos;ll be in touch.
          </p>
        )}

        {homecareLine && (
          <>
            <p className={onSiteActiveNow || onSitePending ? "text-ink-muted" : undefined}>
              {onSiteActiveNow || onSitePending
                ? "You also registered interest in "
                : "You registered interest in "}
              {homecareLine}. That has its own approval process — a chat for jail break, a home
              visit for fostering — and CAPS will contact you about the next steps. You can&apos;t
              take a dog out on homecare until you&apos;ve been approved.
            </p>
            <p className="text-ink-muted">
              We&apos;ve emailed you an acknowledgement — if it&apos;s not in your inbox, check
              your spam or junk folder and mark it &ldquo;not spam&rdquo;.
            </p>
          </>
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
        <legend className="text-sm font-bold">Are you 18 or over?</legend>
        <div className="flex gap-2">
          {(
            [
              ["yes", "Yes"],
              ["no", "No, under 18"],
            ] as const
          ).map(([val, label]) => (
            <label
              key={val}
              className={`flex-1 flex items-center justify-center gap-2 text-sm h-11 rounded-[var(--radius)] border cursor-pointer ${
                over18 === val ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
              }`}
            >
              <input
                type="radio"
                name="over18"
                checked={over18 === val}
                onChange={() => setOver18(val)}
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

      <RadioRows
        legend="Briefly describe your experience and confidence in handling dogs"
        name="experience"
        options={EXPERIENCE_OPTIONS}
        value={form.experienceLevel}
        onChange={(code) => set("experienceLevel", code)}
      />
      {form.experienceLevel === "other" && (
        <Field label="Tell us more">
          <input
            className={inputClass}
            value={form.experienceOther}
            onChange={(e) => set("experienceOther", e.target.value)}
          />
        </Field>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">
          Which activities are you interested in? Tick all that apply.
        </legend>
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
            checked={fosterInterest}
            onChange={(e) => setFosterInterest(e.target.checked)}
          />
          <span>
            <strong>Fostering</strong> — having a dog live in my home for weeks or months.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={jailBreakInterest}
            onChange={(e) => setJailBreakInterest(e.target.checked)}
          />
          <span>
            <strong>Jail break</strong> — taking a dog out for a day trip or overnight.
          </span>
        </label>
        <p className="text-xs text-ink-muted">
          Homecare has its own approval process (a chat for jail break, a home visit for
          fostering). Ticking this just registers your interest — CAPS will contact you about
          the next steps.
        </p>
      </fieldset>

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

      <Field label="How did you hear about volunteering with CAPS?">
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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">
          Do you consent to your image being used to promote CAPS (e.g. Facebook, flyers)?
        </legend>
        <div className="flex gap-2">
          {(
            [
              ["yes", "Yes"],
              ["no", "No"],
            ] as const
          ).map(([val, label]) => (
            <label
              key={val}
              className={`flex-1 flex items-center justify-center gap-2 text-sm h-11 rounded-[var(--radius)] border cursor-pointer ${
                imageConsent === val ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
              }`}
            >
              <input
                type="radio"
                name="imageConsent"
                checked={imageConsent === val}
                onChange={() => setImageConsent(val)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Terms and conditions</legend>
        <div className="max-h-52 overflow-y-auto whitespace-pre-wrap text-sm text-ink-muted border border-line rounded-[var(--radius)] p-3">
          {VOLUNTEER_TERMS}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
          <span>I have read and agree to the above terms.</span>
        </label>
      </fieldset>

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
