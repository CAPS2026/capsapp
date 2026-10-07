"use client";

import { Children, isValidElement, useEffect, useRef, useState, useTransition } from "react";
import { registerVolunteer } from "@/lib/actions/registration";
import { applyForAdoptionPublic, applyForHomecarePublic, checkHomecareApplicant } from "@/lib/actions/homecare-public";
import {
  ageFromDob,
  VOLUNTEER_INTERESTS,
  EXPERIENCE_OPTIONS,
  HOW_HEARD_OPTIONS,
  type RegisterResult,
} from "@/lib/registration";
import { homecareTerms, VOLUNTEER_TERMS } from "@/lib/terms";
import { EMPTY_HOME, homeDetailsError, homePayload, type HomeDetails } from "@/lib/homecare-form";
import { HomeDetailsFields } from "@/components/apply/home-details-fields";
import { PhotoPicker } from "@/components/apply/photo-picker";

const inputClass =
  "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

// A red * after the label when the input inside is `required`.
function Star() {
  return (
    <span className="text-danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  const required = Children.toArray(children).some((c) => isValidElement(c) && (c.props as { required?: boolean }).required);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">
        {label}
        {required && <Star />}
      </span>
      {children}
      {hint && <span className="text-xs text-ink">{hint}</span>}
    </label>
  );
}

function YesNo({
  legend,
  name,
  value,
  onChange,
  noLabel = "No",
}: {
  legend: string;
  name: string;
  value: "" | "yes" | "no";
  onChange: (v: "yes" | "no") => void;
  noLabel?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-bold">
        {legend}
        <Star />
      </legend>
      <div className="flex gap-2">
        {(
          [
            ["yes", "Yes"],
            ["no", noLabel],
          ] as const
        ).map(([val, label]) => (
          <label
            key={val}
            className={`flex-1 flex items-center justify-center gap-2 text-sm h-11 rounded-[var(--radius)] border cursor-pointer ${
              value === val ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
            }`}
          >
            <input type="radio" name={name} checked={value === val} onChange={() => onChange(val)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Same rule the server applies: 8–15 digits once spaces, dashes and + are ignored.
function phoneOk(p: string) {
  const n = p.replace(/\D/g, "").length;
  return n >= 8 && n <= 15;
}

function emailOk(e: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
}

type Step = "start" | "about" | "contact" | "dogs" | "homecare" | "finish";

const STEP_TITLE: Record<Step, string> = {
  start: "Your interests",
  about: "About you",
  contact: "Emergency contact",
  dogs: "You and dogs",
  homecare: "Your home",
  finish: "Finish up",
};

// ONE form for everyone (Paul, 2026-10-05): volunteering on site, fostering,
// jail break, or any mix. It runs as a few short pages. If the email and
// surname given on the first page already belong to someone registered, the
// personal pages are skipped — they only give the home details for
// fostering / jail break, and sign.
export function VolunteerForm({ homecareFirst = false, onDone }: { homecareFirst?: boolean; onDone?: () => void }) {
  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    nickname: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    ecName: "",
    ecSurname: "",
    ecPhone: "",
    ecRelationship: "",
    ecEmail: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentSignature: "",
    parentalConsent: false,
    experienceLevel: "",
    experienceOther: "",
    medicalIssues: "",
    howHeard: "",
    howHeardOther: "",
    signatureName: "",
    website: "", // honeypot
  });
  const [onSite, setOnSite] = useState(!homecareFirst);
  const [fosterInterest, setFosterInterest] = useState(false);
  const [jailBreakInterest, setJailBreakInterest] = useState(false);
  const [adoptionInterest, setAdoptionInterest] = useState(false);
  const [over18, setOver18] = useState<"" | "yes" | "no">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [home, setHome] = useState<HomeDetails>(EMPTY_HOME);
  const [photo, setPhoto] = useState("");
  const [imageConsent, setImageConsent] = useState<"" | "yes" | "no">("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registered, setRegistered] = useState(false); // already on file
  const [step, setStepRaw] = useState<Step>("start");
  const restored = useRef(false);

  // Every page change is a browser-history entry, so the phone's Back / Forward
  // buttons move between pages instead of leaving the form.
  const goStep = (next: Step) => {
    setStepRaw(next);
    window.history.pushState({ step: next }, "", `#${next}`);
  };
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"active" | "pending" | "applied" | null>(null);
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);
  const [isPending, startTransition] = useTransition();

  const wantsHomecare = fosterInterest || jailBreakInterest;
  const wantsAnything = onSite || wantsHomecare || adoptionInterest;
  // Volunteer terms for anyone registering (or helping on site); the foster /
  // jail break agreement as well when they're taking a dog home.
  const termsText = [
    !registered || onSite ? (wantsHomecare ? `VOLUNTEER TERMS\n\n${VOLUNTEER_TERMS}` : VOLUNTEER_TERMS) : null,
    wantsHomecare
      ? `FOSTER CARE & JAIL BREAK TERMS\n\n${homecareTerms({ foster: fosterInterest, jailBreak: jailBreakInterest })}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  const dobAge = form.dateOfBirth ? ageFromDob(form.dateOfBirth) : null;
  const isMinor = over18 === "no" || (dobAge !== null && dobAge < 18);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleInterest = (code: string) =>
    setInterests((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  // The pages this person will see, in order.
  const steps: Step[] = registered
    ? ["start", ...(wantsHomecare ? (["homecare"] as Step[]) : []), "finish"]
    : ["start", "about", "contact", "dogs", ...(wantsHomecare ? (["homecare"] as Step[]) : []), "finish"];
  const idx = steps.indexOf(step);
  const isLast = idx === steps.length - 1;

  // Keep what's been typed if the page is reloaded or the browser wanders off
  // (Paul lost his progress twice, 2026-10-05). Stored only in this tab's
  // session storage, cleared when the form is submitted.
  const STORE = "caps-join-form-v1";
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORE);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.form) setForm((f) => ({ ...f, ...d.form, website: "" }));
        if (typeof d.onSite === "boolean") setOnSite(d.onSite);
        setFosterInterest(!!d.fosterInterest);
        setJailBreakInterest(!!d.jailBreakInterest);
        setAdoptionInterest(!!d.adoptionInterest);
        if (d.over18) setOver18(d.over18);
        if (Array.isArray(d.interests)) setInterests(d.interests);
        if (d.home) setHome({ ...EMPTY_HOME, ...d.home });
        if (typeof d.photo === "string") setPhoto(d.photo);
        if (d.imageConsent) setImageConsent(d.imageConsent);
        setRegistered(!!d.registered);
        if (d.step) setStepRaw(d.step);
        window.history.replaceState({ step: d.step ?? "start" }, "", `#${d.step ?? "start"}`);
      } else {
        window.history.replaceState({ step: "start" }, "", "#start");
      }
    } catch {
      /* storage blocked or corrupt: start fresh */
    }
    restored.current = true;
    const onPop = (e: PopStateEvent) => setStepRaw((e.state?.step as Step | undefined) ?? "start");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      if (done) {
        window.sessionStorage.removeItem(STORE);
        return;
      }
      window.sessionStorage.setItem(
        STORE,
        JSON.stringify({
          form: { ...form, signatureName: "", parentalConsent: false },
          onSite,
          fosterInterest,
          jailBreakInterest,
          adoptionInterest,
          over18,
          interests,
          home,
          photo,
          imageConsent,
          registered,
          step,
        }),
      );
    } catch {
      /* quota or blocked: ignore */
    }
  }, [form, onSite, fosterInterest, jailBreakInterest, adoptionInterest, over18, interests, home, photo, imageConsent, registered, step, done]);

  function back() {
    setError(null);
    if (idx > 0) goStep(steps[idx - 1]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === "start") {
      if (!wantsAnything) return setError("Please tick at least one thing you're interested in.");
      if (!emailOk(form.email)) return setError("Your email address doesn't look right — please check it.");
      startTransition(async () => {
        const r = await checkHomecareApplicant({
          email: form.email,
          surname: form.surname,
          firstName: form.firstName,
          dateOfBirth: form.dateOfBirth,
          website: form.website,
        });
        if (r.registered) {
          if (!wantsHomecare && !adoptionInterest) {
            setError("You're already registered — you're good to go. Check in with a caretaker when you're at the shelter.");
            return;
          }
          setRegistered(true);
          goStep(wantsHomecare ? "homecare" : "finish");
        } else {
          setRegistered(false);
          goStep("about");
        }
      });
      return;
    }
    if (step === "about") {
      if (!phoneOk(form.phone)) return setError("Your phone number doesn't look right — please check it (include the area or mobile code).");
      if (!over18) return setError("Please tell us whether you're 18 or over.");
      if (isMinor && !phoneOk(form.parentPhone))
        return setError("The parent / guardian's phone number doesn't look right — please check it.");
      if (isMinor && !emailOk(form.parentEmail))
        return setError("The parent / guardian's email address doesn't look right — please check it.");
    }
    if (step === "contact" && !phoneOk(form.ecPhone))
      return setError("The emergency contact's phone number doesn't look right — please check it.");
    if (step === "contact" && form.ecEmail.trim() && !emailOk(form.ecEmail))
      return setError("The emergency contact's email address doesn't look right — please check it.");
    if (step === "homecare") {
      const homeErr = homeDetailsError(home);
      if (homeErr) return setError(homeErr);
    }
    if (step === "dogs") {
      if (!form.experienceLevel) return setError("Please pick the option that best describes your experience.");
      if (onSite && interests.length === 0) return setError("Pick at least one thing you'd like to help with.");
    }
    if (!isLast) {
      goStep(steps[idx + 1]);
      return;
    }

    // Last page: send it.
    if (!registered && !imageConsent) return setError("Please answer the promotional-image question.");
    if (!agreeTerms) return setError("Please agree to the terms to continue.");

    startTransition(async () => {
      if (registered) {
        if (wantsHomecare) {
          const r = await applyForHomecarePublic({
            email: form.email,
            surname: form.surname,
            firstName: form.firstName,
            dateOfBirth: form.dateOfBirth,
            website: form.website,
            application: {
              jailBreak: jailBreakInterest,
              foster: fosterInterest,
              ...homePayload(home),
              agreeTerms,
              signatureName: form.signatureName,
            },
            photoData: photo || undefined,
          });
          if (r.error) return setError(r.error);
        }
        if (adoptionInterest) {
          const r = await applyForAdoptionPublic({
            email: form.email,
            surname: form.surname,
            firstName: form.firstName,
            dateOfBirth: form.dateOfBirth,
            website: form.website,
            photoData: photo || undefined,
          });
          if (r.error) return setError(r.error);
        }
        setDone("applied");
        return;
      }
      const result: RegisterResult = await registerVolunteer({
        ...form,
        ecName: `${form.ecName.trim()} ${form.ecSurname.trim()}`.trim(),
        over18: over18 === "yes",
        interests: onSite ? interests : [],
        fosterInterest,
        jailBreakInterest,
        adoptionInterest,
        home: wantsHomecare ? homePayload(home) : undefined,
        photoData: photo || undefined,
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
    const onSiteActiveNow = done === "active" && onSite && !registered;
    const onSitePending = done === "pending" && onSite;
    return (
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {onSiteActiveNow ? "You're registered" : "Thanks — we've got your application"}
        </h2>

        {onSiteActiveNow && (
          <p>
            You can start helping with dog walking straight away. Next time you&apos;re at the shelter, check in with a
            caretaker and they&apos;ll set you up with a dog.
          </p>
        )}
        {onSitePending && (
          <p>
            Because you&apos;re under 18, someone from CAPS needs to confirm your parent or guardian&apos;s consent
            before you can start on-site. We&apos;ll be in touch.
          </p>
        )}

        {homecareLine && (
          <>
            <p>
              You applied for {homecareLine}. CAPS reviews each application — a chat for jail break, a home visit for
              fostering — and will contact you about the next steps. You can&apos;t take a dog out on homecare until
              you&apos;ve been approved.
            </p>
            <p className="text-ink">
              We&apos;ve emailed you a confirmation — if it&apos;s not in your inbox, check your spam or junk folder and
              mark it &ldquo;not spam&rdquo;.
            </p>
          </>
        )}

        {adoptionInterest && (
          <p>You said you&apos;re interested in adoption — someone from CAPS will be in touch to chat about the next steps.</p>
        )}

        <p className="text-ink">
          Want to change your interests, or foster or adopt later? Just fill in this form again and update your
          interests.
        </p>
        <a
          href="https://capeanimalprotectionshelter.org.au"
          className="h-11 flex items-center justify-center rounded-[var(--radius)] bg-brand text-white font-bold"
        >
          Go to the CAPS website
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-xs text-ink">
        <span>
          Step {idx + 1} of {steps.length}
        </span>
        <span className="text-2xl font-extrabold text-ink" style={{ fontFamily: "var(--font-display)" }}>{STEP_TITLE[step]}</span>
      </div>
      <p className="text-xs text-ink -mt-3">
        <span className="text-danger">*</span> means the question must be answered.
      </p>
      <div className="h-1.5 rounded-full bg-gray-tint overflow-hidden" aria-hidden="true">
        <div className="h-full bg-brand" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </div>

      {/* ---------------- 1. start */}
      {step === "start" && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-bold">
              Select your interests below.
              <Star />
            </legend>
            {(
              [
                [onSite, setOnSite, "Volunteer at the shelter", "includes becoming a member of our committee. Complete the form and start right away."],
                [jailBreakInterest, setJailBreakInterest, "Jail break", "taking a dog out for the day, or to stay with me overnight. This needs a brief chat about your home setup."],
                [fosterInterest, setFosterInterest, "Fostering", "having a dog live in my home. This needs an in-person yard check."],
                [adoptionInterest, setAdoptionInterest, "Adoption", "becoming the permanent owner of a CAPS dog or cat."],
              ] as const
            ).map(([checked, setter, title, blurb]) => (
              <label
                key={title}
                className={`flex items-start gap-2 text-sm px-3 py-3 rounded-[var(--radius)] border cursor-pointer ${
                  checked ? "border-brand bg-brand-tint" : "border-line-cool"
                }`}
              >
                <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => setter(e.target.checked)} />
                <span>
                  <strong>{title}</strong> — {blurb}
                </span>
              </label>
            ))}
          </fieldset>

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
          </div>
          <p className="text-base text-ink">
            If you&apos;re already registered with CAPS we&apos;ll recognise you (by email, or by name and date of birth) and only ask what&apos;s new.
          </p>
        </>
      )}

      {/* ---------------- 2. about you */}
      {step === "about" && (
        <>
          <p className="text-sm text-ink bg-gray-tint rounded-[var(--radius)] p-3">
            We couldn&apos;t find a registration for those details. If you&apos;ve registered before, tap{" "}
            <strong>Back</strong> and check your name, date of birth and the email you used then. Otherwise, carry on and we&apos;ll set you up as new.
          </p>
          <Field label="What should we call you (nickname)?" hint="Optional.">
            <input
              className={inputClass}
              autoComplete="nickname"
              value={form.nickname}
              onChange={(e) => set("nickname", e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Address" hint="Optional.">
              <input
                className={inputClass}
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
          </div>

          <YesNo legend="Are you 18 or over?" name="over18" value={over18} onChange={setOver18} noLabel="No, under 18" />

          {isMinor && (
            <fieldset className="flex flex-col gap-3 border border-warm rounded-[var(--radius)] p-4 bg-warm-tint">
              <legend className="text-sm font-bold px-1">Parent or guardian</legend>
              <p className="text-xs text-warm-ink">
                You&apos;re under 18, so a parent or guardian must consent. We&apos;ll email them a copy of what&apos;s
                been agreed, and CAPS will confirm before you can start.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Parent / guardian name">
                  <input className={inputClass} required value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
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
              <Field label="Parent / guardian email" hint="We email their consent confirmation here.">
                <input
                  type="email"
                  inputMode="email"
                  className={inputClass}
                  required
                  value={form.parentEmail}
                  onChange={(e) => set("parentEmail", e.target.value)}
                />
              </Field>
              <Field label="Parent / guardian: type your full name to give consent">
                <input className={inputClass} required value={form.parentSignature} onChange={(e) => set("parentSignature", e.target.value)} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  required
                  checked={form.parentalConsent}
                  onChange={(e) => set("parentalConsent", e.target.checked)}
                />
                <span>I am the parent or guardian named above and I consent to this person taking part with CAPS.</span>
              </label>
            </fieldset>
          )}
        </>
      )}

      {/* ---------------- 3. emergency contact */}
      {step === "contact" && (
        <fieldset className="flex flex-col gap-3">
          <p className="text-sm text-ink">Someone we can call if there&apos;s a problem while you&apos;re out with a dog.</p>
          {isMinor && form.parentName.trim() && (
            <button
              type="button"
              className="self-start text-sm font-bold px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white"
              onClick={() => {
                const parts = form.parentName.trim().split(/\s+/);
                const last = parts.length > 1 ? parts.pop()! : "";
                setForm((f) => ({
                  ...f,
                  ecName: parts.join(" "),
                  ecSurname: last,
                  ecPhone: f.parentPhone,
                  ecEmail: f.parentEmail,
                  ecRelationship: "Parent / guardian",
                }));
              }}
            >
              Same as my parent / guardian
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input className={inputClass} required value={form.ecName} onChange={(e) => set("ecName", e.target.value)} />
            </Field>
            <Field label="Surname">
              <input className={inputClass} required value={form.ecSurname} onChange={(e) => set("ecSurname", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Relationship" hint="e.g. partner, parent, friend.">
              <input className={inputClass} value={form.ecRelationship} onChange={(e) => set("ecRelationship", e.target.value)} />
            </Field>
          </div>
          <Field label="Email" hint="Optional.">
            <input type="email" inputMode="email" className={inputClass} value={form.ecEmail} onChange={(e) => set("ecEmail", e.target.value)} />
          </Field>
        </fieldset>
      )}

      {/* ---------------- 4. you and dogs */}
      {step === "dogs" && (
        <>
          <Field label="Briefly describe your experience and confidence in handling dogs">
            <select
              className={inputClass}
              required
              value={form.experienceLevel}
              onChange={(e) => set("experienceLevel", e.target.value)}
            >
              <option value="">Choose one…</option>
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          {form.experienceLevel === "other" && (
            <Field label="Tell us more">
              <input className={inputClass} value={form.experienceOther} onChange={(e) => set("experienceOther", e.target.value)} />
            </Field>
          )}

          {onSite && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-bold">
                Which activities at the shelter are you interested in? Tick all that apply.
                <Star />
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {VOLUNTEER_INTERESTS.map((i) => (
                  <label
                    key={i.code}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-[var(--radius)] border cursor-pointer ${
                      interests.includes(i.code) ? "border-brand bg-brand-tint" : "border-line-cool"
                    }`}
                  >
                    <input type="checkbox" checked={interests.includes(i.code)} onChange={() => toggleInterest(i.code)} />
                    {i.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <Field
            label="Any medical conditions we should know about?"
            hint="Optional — only what matters if you're out with a dog (e.g. asthma, a bad back)."
          >
            <textarea rows={2} className={areaClass} value={form.medicalIssues} onChange={(e) => set("medicalIssues", e.target.value)} />
          </Field>

          <Field label="How did you hear about CAPS?">
            <select className={inputClass} value={form.howHeard} onChange={(e) => set("howHeard", e.target.value)}>
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
              <input className={inputClass} value={form.howHeardOther} onChange={(e) => set("howHeardOther", e.target.value)} />
            </Field>
          )}
        </>
      )}

      {/* ---------------- 5. home (fostering / jail break) */}
      {step === "homecare" && (
        <>
          {registered && (
            <p className="text-sm text-ink bg-brand-tint rounded-[var(--radius)] p-3">
              Welcome back — we found your registration, so we only need details about your home and garden.
            </p>
          )}
          <HomeDetailsFields value={home} onChange={setHome} jailBreak={jailBreakInterest} foster={fosterInterest} />
        </>
      )}

      {/* ---------------- 6. finish */}
      {step === "finish" && (
        <>
          {!registered && (
            <YesNo
              legend="Do you consent to your image being used to promote CAPS (e.g. Facebook, flyers)?"
              name="imageConsent"
              value={imageConsent}
              onChange={setImageConsent}
            />
          )}

          <PhotoPicker
            value={photo}
            onChange={setPhoto}
            label="Add a photo (optional)"
            hint="Totally optional — it just helps personalise your experience in the app. You can skip it."
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-bold">Terms and conditions</legend>
            <div className="max-h-52 overflow-y-auto whitespace-pre-wrap text-sm text-ink border border-line rounded-[var(--radius)] p-3">
              {termsText}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              <span>
                I have read and agree to the above terms.
                <Star />
              </span>
            </label>
          </fieldset>

          <Field label="Type your name to sign">
            <input className={inputClass} required value={form.signatureName} onChange={(e) => set("signatureName", e.target.value)} />
          </Field>
        </>
      )}

      {/* Honeypot: hidden from people, catnip for bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        {idx > 0 && (
          <button
            type="button"
            onClick={back}
            className="h-12 px-5 rounded-[var(--radius)] border border-line-cool font-semibold"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 h-12 rounded-[var(--radius)] text-white font-bold disabled:opacity-60 ${
            isLast ? "bg-ok" : "bg-brand"
          }`}
        >
          {isPending ? "One moment…" : isLast ? (registered ? "Submit application" : "Register") : "Next"}
        </button>
      </div>
    </form>
  );
}
