"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyForHomecare } from "@/lib/actions/homecare-apply";
import { homePayload, type HomeDetails } from "@/lib/homecare-form";
import { HomeDetailsFields } from "@/components/apply/home-details-fields";

const inputClass = "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

// Staff-started homecare application for someone already registered. Their
// personal details are on file, so this only asks for the home and garden
// details — pre-filled with whatever we already hold, so staff only add or
// correct what's missing. Approval then runs the normal route: jail break by
// the emailed one-click link or in the app, foster after a passing home check.
export function ApplyHomecareForm({
  personId,
  personName,
  hasEmail,
  alreadyJailBreak,
  alreadyFoster,
  initialProgram,
  initialHome,
}: {
  personId: string;
  personName: string;
  hasEmail: boolean;
  alreadyJailBreak: boolean;
  alreadyFoster: boolean;
  initialProgram: "jail_break" | "foster" | null;
  initialHome: HomeDetails;
}) {
  const [jailBreak, setJailBreak] = useState(initialProgram === "jail_break");
  const [foster, setFoster] = useState(initialProgram === "foster");
  const [home, setHome] = useState<HomeDetails>(initialHome);
  const [signatureName, setSignatureName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // How much of the home section we already had before they opened the form.
  const onFile = [
    initialHome.propertyOwnership,
    initialHome.fenceType,
    initialHome.fenceHeight,
    initialHome.peopleAtHome,
    initialHome.childrenU16,
    initialHome.otherAnimals,
    initialHome.animalDetails,
  ].filter((v) => v.trim() !== "").length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await applyForHomecare(personId, {
        jailBreak,
        foster,
        ...homePayload(home),
        agreeTerms: agree,
        signatureName,
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
        For {personName}. Their personal details are already on file. They stay <strong>pending</strong> until
        approved — jail break by the emailed link or in the app, foster after a home check.
      </p>
      <p className={`text-sm rounded-[var(--radius)] p-3 ${onFile > 0 ? "bg-brand-tint text-brand-ink" : "bg-gray-tint text-ink"}`}>
        {onFile > 0
          ? `We already hold ${onFile} of 7 home details — they're filled in below. Check them and add anything missing.`
          : "No home details on file yet — please fill them in."}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Which program?</legend>
        {!alreadyJailBreak && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={jailBreak} onChange={(e) => setJailBreak(e.target.checked)} />
            Jail break
          </label>
        )}
        {!alreadyFoster && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={foster} onChange={(e) => setFoster(e.target.checked)} />
            Foster
          </label>
        )}
        {alreadyJailBreak && <p className="text-xs text-ink">Already has a jail break carer role.</p>}
        {alreadyFoster && <p className="text-xs text-ink">Already has a foster carer role.</p>}
      </fieldset>

      <HomeDetailsFields value={home} onChange={setHome} jailBreak={jailBreak} foster={foster} />

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>The applicant has read and agrees to the CAPS homecare terms.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Applicant types their full name to sign</span>
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
