"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { applyForHomecarePublic, checkHomecareApplicant } from "@/lib/actions/homecare-public";
import { EMPTY_HOME, homePayload, type HomeDetails } from "@/lib/homecare-form";
import { HomeDetailsFields } from "@/components/apply/home-details-fields";

const inputClass = "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

// The public homecare form (the one behind the QR code). Step 1 asks who you
// are (email + surname) and which program. If you're already registered you
// only give the home and garden details — nothing personal is asked again,
// and nothing about you is shown back. If you're not registered yet you're
// sent to the one registration form with homecare already ticked.
export function HomecarePublicForm() {
  const [stage, setStage] = useState<"lookup" | "details" | "new" | "done">("lookup");
  const [email, setEmail] = useState("");
  const [surname, setSurname] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [foster, setFoster] = useState(false);
  const [jailBreak, setJailBreak] = useState(false);
  const [home, setHome] = useState<HomeDetails>(EMPTY_HOME);
  const [agree, setAgree] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!foster && !jailBreak) return setError("Please tick fostering, jail break, or both.");
    startTransition(async () => {
      const r = await checkHomecareApplicant({ email, surname, website });
      setStage(r.registered ? "details" : "new");
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await applyForHomecarePublic({
        email,
        surname,
        website,
        application: { jailBreak, foster, ...homePayload(home), agreeTerms: agree, signatureName },
      });
      if (r.error) setError(r.error);
      else setStage("done");
    });
  }

  const programs = [foster && "foster", jailBreak && "jail_break"].filter(Boolean).join(",");
  const programText = [foster && "fostering", jailBreak && "the jail break program"].filter(Boolean).join(" and ");

  if (stage === "done") {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Thanks — we&apos;ve got your application
        </h2>
        <p>
          You applied for {programText}. CAPS will review it and be in touch. You can&apos;t take a dog out on
          homecare until you&apos;ve been approved.
        </p>
        <p className="text-ink">
          We&apos;ve emailed you a confirmation — if it&apos;s not in your inbox, check your spam or junk folder.
        </p>
      </div>
    );
  }

  if (stage === "new") {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          We don&apos;t have you registered yet
        </h2>
        <p>
          No problem — one short registration covers everything, and includes the home questions for{" "}
          {programText}. Volunteering on site is optional.
        </p>
        <Link
          href={`/apply/volunteer?homecare=${programs}&email=${encodeURIComponent(email)}`}
          className="h-12 rounded-[var(--radius)] bg-brand text-white font-bold flex items-center justify-center"
        >
          Continue to registration
        </Link>
        <button type="button" onClick={() => setStage("lookup")} className="text-ink underline text-sm self-start">
          Check a different email
        </button>
      </div>
    );
  }

  if (stage === "details") {
    return (
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-ink">
          Thanks — we found your registration, so we only need details about your home and garden for{" "}
          {programText}.
        </p>
        <HomeDetailsFields value={home} onChange={setHome} jailBreak={jailBreak} foster={foster} />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I confirm these details are correct and I agree to the CAPS terms and conditions.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Type your full name to sign</span>
          <input className={inputClass} required value={signatureName} onChange={(e) => setSignatureName(e.target.value)} />
        </label>
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

  return (
    <form onSubmit={lookup} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">What are you interested in?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={foster} onChange={(e) => setFoster(e.target.checked)} />
          <span>
            <strong>Fostering</strong> — having a dog live in my home for weeks or months.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={jailBreak} onChange={(e) => setJailBreak(e.target.checked)} />
          <span>
            <strong>Jail break</strong> — taking a dog out for a day trip or overnight.
          </span>
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Your email</span>
        <input type="email" inputMode="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Your surname</span>
        <input required className={inputClass} value={surname} onChange={(e) => setSurname(e.target.value)} />
      </label>

      {/* Honeypot: hidden from people, catnip for bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
      >
        {isPending ? "Checking…" : "Next"}
      </button>
    </form>
  );
}
