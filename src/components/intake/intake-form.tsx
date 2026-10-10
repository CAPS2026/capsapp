"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDogIntake, updateDogDetails } from "@/lib/actions/intake";
import { listActiveCarers } from "@/lib/actions/dog-activity";
import { prepareDogPhotoUploads, registerDogPhotos } from "@/lib/actions/dog-photos";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { shrinkToJpeg } from "@/lib/image-shrink";
import { DueBackPicker } from "@/components/intake/due-back";
import {
  AGE_BANDS,
  AU_STATES,
  BEHAVIOUR_OPTIONS,
  COAT_LENGTHS,
  COLOURS,
  CONDITIONS,
  DISTANCE_OPTIONS,
  EMPTY_INTAKE,
  INTAKE_REASONS,
  INTAKE_SOURCES,
  intakeIssues,
  profileIssues,
  recordIssues,
  type Issue,
  SEX_OPTIONS,
  SIZE_OPTIONS,
  SOURCES_WITH_PERSON,
  START_STATUSES,
  YARD_CHOICES,
  VACCINE_TYPES,
  YES_NO_UNTESTED,
  type IntakeInput,
  type YN,
} from "@/lib/intake";
import { YES_NO } from "@/lib/home-options";
import { Pick, PickOther } from "@/components/apply/pick";

// Compact on purpose: this screen has a lot of questions, and tablets need room for each one.
const inputClass = "h-10 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm w-full";
const areaClass = "px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-sm w-full";

// Dropdowns sized to match this screen's compact text boxes.
const P = (props: React.ComponentProps<typeof Pick>) => <Pick className={inputClass} {...props} />;
const PO = (props: React.ComponentProps<typeof PickOther>) => <PickOther className={inputClass} {...props} />;

function Star() {
  return (
    <span className="text-danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

// Orange tag on every question SavourLife also asks, so staff can see which answers
// are sent to (or pasted into) their listing.
function SL() {
  return (
    <span
      title="This is captured for SavourLife"
      className="mr-1.5 px-1 py-px rounded text-[9px] font-bold bg-warm-tint text-warm-ink border border-warm align-middle"
    >
      SL
    </span>
  );
}

// The keys of every field with a problem, so each one can be ringed in red.
const IssueKeys = createContext<Set<string>>(new Set());

function Field({
  label,
  required,
  sl,
  hint,
  k,
  children,
}: {
  label: string;
  required?: boolean;
  sl?: boolean;
  hint?: string;
  /** The field's key on the form, used to ring it red when it has a problem. */
  k?: string;
  children: React.ReactNode;
}) {
  const keys = useContext(IssueKeys);
  const bad = !!k && keys.has(k);
  return (
    <label
      data-key={k}
      className={`flex flex-col gap-1 text-sm ${
        bad
          ? "[&_input]:border-danger [&_select]:border-danger [&_textarea]:border-danger [&_input]:ring-2 [&_select]:ring-2 [&_textarea]:ring-2 [&_input]:ring-danger/30 [&_select]:ring-danger/30 [&_textarea]:ring-danger/30"
          : ""
      }`}
    >
      <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
        {sl && <SL />}
        {label}
        {required && <Star />}
      </span>
      {children}
      {hint && <span className="text-xs text-ink">{hint}</span>}
    </label>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5 border border-line rounded-[var(--radius)] bg-card p-5">
      <legend className="text-base font-extrabold px-1" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </legend>
      {note && <p className="text-xs text-ink -mt-1">{note}</p>}
      {children}
    </fieldset>
  );
}

export function IntakeForm({
  officerName,
  today,
  edit,
}: {
  officerName: string;
  today: string;
  /** Present when editing an existing dog: its saved values, and which parts this person may change. */
  edit?: { dogId: string; initial: IntakeInput; showRecord: boolean };
}) {
  // New intake: the sign-off is filled from whoever is signed in (an admin); they can still edit it before saving.
  const start: IntakeInput = edit?.initial ?? { ...EMPTY_INTAKE, intakeDate: today, officerName, signedName: officerName };
  const [f, setF] = useState<IntakeInput>(start);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ dogId: string; ref: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showIssues, setShowIssues] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const computeIssues = (): Issue[] =>
    edit ? [...profileIssues(f), ...(edit.showRecord ? recordIssues(f) : [])] : intakeIssues(f);
  // After a failed save the list updates as things are fixed, so it shrinks to nothing.
  useEffect(() => {
    if (showIssues) setIssues(computeIssues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, showIssues]);

  function jumpTo(key: string) {
    const el = document.querySelector<HTMLElement>(`[data-key="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
  }
  const [carers, setCarers] = useState<{ id: string; name: string }[]>([]);
  // Photos picked before saving: uploaded to the new dog as part of Save intake.
  const [staged, setStaged] = useState<{ id: string; file: File; url: string }[]>([]);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!edit && (f.startStatus === "foster" || f.startStatus === "jail_break")) {
      listActiveCarers(f.startStatus).then(setCarers);
    }
  }, [edit, f.startStatus]);

  function stagePhotos(files: FileList | null) {
    const picked = Array.from(files ?? []).filter((x) => x.type.startsWith("image/"));
    setStaged((cur) => [
      ...cur,
      ...picked.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file) })),
    ]);
    if (photoRef.current) photoRef.current.value = "";
  }
  function moveStaged(i: number, dir: -1 | 1) {
    setStaged((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const set = <K extends keyof IntakeInput>(k: K, v: IntakeInput[K]) => setF((x) => ({ ...x, [k]: v }));

  function toggleBehaviour(code: string) {
    const has = f.behaviour.includes(code);
    const next = has ? f.behaviour.filter((b) => b !== code) : [...f.behaviour, code];
    setF((x) => ({
      ...x,
      behaviour: next,
      // Aggressive suggests experienced handlers only; staff can untick it.
      experiencedOnly: code === "aggressive" && !has ? true : x.experiencedOnly,
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const found = computeIssues();
    if (found.length > 0) {
      setIssues(found);
      setShowIssues(true);
      summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (edit) {
      // Editing: the profile always; the paper record only when this person can change it. No sign-off.
      startTransition(async () => {
        const r = await updateDogDetails(edit.dogId, f);
        if (!("ok" in r)) return setError(r.error);
        router.push(`/dogs/${edit.dogId}`);
        router.refresh();
      });
      return;
    }
    startTransition(async () => {
      // The due-back time is picked in local time; the server wants an exact moment.
      const payload = {
        ...f,
        startDueBack: f.startStatus === "available" ? "" : new Date(f.startDueBack).toISOString(),
      };
      const r = await createDogIntake(payload);
      if (!("ok" in r)) return setError(r.error);

      // Photos need the dog to exist, so they go up straight after it is saved.
      let note: string | null = null;
      if (staged.length > 0) {
        try {
          const prep = await prepareDogPhotoUploads(r.dogId, staged.length);
          if (!("ok" in prep)) throw new Error(prep.error);
          const supabase = createBrowserSupabase();
          const done: string[] = [];
          for (let i = 0; i < staged.length; i++) {
            const blob = await shrinkToJpeg(staged[i].file);
            const { path, token } = prep.uploads[i];
            const { error: upErr } = await supabase.storage.from("dog-photos").uploadToSignedUrl(path, token, blob, {
              contentType: "image/jpeg",
            });
            if (upErr) throw new Error(upErr.message);
            done.push(path);
          }
          const reg = await registerDogPhotos(r.dogId, done);
          if (!("ok" in reg)) throw new Error(reg.error);
        } catch (e) {
          note = `The dog is saved, but the photos didn't upload (${e instanceof Error ? e.message : "unknown error"}). Add them with Edit dog.`;
        }
      }
      setPhotoNote(note);
      setSaved({ dogId: r.dogId, ref: r.ref, name: f.name.trim() });
      window.scrollTo({ top: 0 });
    });
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-4 border border-line rounded-[var(--radius)] bg-card p-5">
        <h2 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {saved.name} is in ({saved.ref})
        </h2>
        <p className="text-sm text-ink">
          The intake record is saved and signed. Add photos next — SavourLife needs at least one, and the first is the featured image. Staff and admin can see
          every detail on the dog&apos;s page; volunteers see only the essentials.
        </p>
        {photoNote && <p className="text-sm text-danger">{photoNote}</p>}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/dogs/${saved.dogId}`)}
            className="h-12 px-5 rounded-[var(--radius)] bg-brand text-white font-bold"
          >
            Open {saved.name}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dogs/${saved.dogId}/edit`)}
            className="h-12 px-5 rounded-[var(--radius)] border border-brand text-brand-ink font-bold"
          >
            Add photos
          </button>
          <button
            type="button"
            onClick={() => {
              setF(start);
              setStaged([]);
              setPhotoNote(null);
              setSaved(null);
            }}
            className="h-12 px-5 rounded-[var(--radius)] border border-line-cool font-semibold"
          >
            Take in another dog
          </button>
        </div>
      </div>
    );
  }

  // The intake date is part of the signed record, so only someone who can change that record sees it when editing.
  const showDate = !edit || edit.showRecord;

  const summary =
    issues.length > 0 ? (
      <div ref={summaryRef} className="rounded-[var(--radius)] border-2 border-danger bg-white p-4 text-sm" role="alert">
        <p className="font-extrabold text-danger">
          {issues.length === 1 ? "1 thing to fix before saving:" : `${issues.length} things to fix before saving:`}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {issues.map((i) => (
            <li key={i.key}>
              <button type="button" onClick={() => jumpTo(i.key)} className="text-left underline text-danger">
                {i.message}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <IssueKeys.Provider value={new Set(issues.map((i) => i.key))}>
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-xs text-ink">
        <span className="text-danger">*</span> means the question must be answered. <SL /> marks everything SavourLife also
        asks for, in the order their form uses.
      </p>
      {issues.length > 0 && summary}

      <Section title="The dog" note="Answers tagged SL go on the SavourLife listing.">
        {(showDate || !edit) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {showDate && (
              <Field k="intakeDate" label="Date of intake" required>
                <input type="date" className={inputClass} value={f.intakeDate} onChange={(e) => set("intakeDate", e.target.value)} />
              </Field>
            )}
            {!edit && (
              <Field k="startStatus" label="Starting status" required>
                <P value={f.startStatus} onChange={(v) => set("startStatus", v)} options={START_STATUSES} />
              </Field>
            )}
            {!edit && f.startStatus === "yard" && (
              <Field k="startYard" label="Which yard" required>
                <P value={f.startYard} onChange={(v) => set("startYard", v)} options={YARD_CHOICES} />
              </Field>
            )}
            {!edit && (f.startStatus === "foster" || f.startStatus === "jail_break") && (
              <Field k="startPersonId" label={f.startStatus === "foster" ? "Foster carer" : "Jail break carer"} required>
                <P
                  value={f.startPersonId}
                  onChange={(v) => set("startPersonId", v)}
                  options={carers.map((c): [string, string] => [c.id, c.name])}
                />
              </Field>
            )}
          </div>
        )}
        {!edit && f.startStatus !== "available" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <Field k="startDueBack" label="Back in…" required>
              <DueBackPicker value={f.startDueBack} onChange={(v) => set("startDueBack", v)} />
            </Field>
            <Field
              k="startNotes"
              label={f.startStatus === "bed_rest" ? "Why bed rest?" : "Notes"}
              required={f.startStatus === "bed_rest"}
            >
              <input className={inputClass} value={f.startNotes} onChange={(e) => set("startNotes", e.target.value)} />
            </Field>
          </div>
        )}
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink pt-1">About the dog</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field k="name" label="Name" required sl>
            <input
              className={inputClass}
              placeholder="As on the microchip"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field k="breed" label="Breed" required sl>
            <input className={inputClass} value={f.breed} onChange={(e) => set("breed", e.target.value)} />
          </Field>
          <Field k="sex" label="Sex" required sl>
            <P value={f.sex} onChange={(v) => set("sex", v)} options={SEX_OPTIONS} />
          </Field>
          <Field k="dateOfBirth" label="Date of birth" required sl>
            <input
              type="date"
              className={inputClass}
              value={f.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Or approx. age" sl>
            <P
              value={f.ageBand}
              onChange={(v) => set("ageBand", v)}
              options={AGE_BANDS.map(([k, label]): [string, string] => [k, label])}
            />
          </Field>
          <Field label="Adult size" sl>
            <P value={f.sizeWhenAdult} onChange={(v) => set("sizeWhenAdult", v)} options={SIZE_OPTIONS} />
          </Field>
          <Field label="Coat length" sl>
            <P value={f.coatLength} onChange={(v) => set("coatLength", v)} options={COAT_LENGTHS} />
          </Field>
          <Field label="Colour">
            <PO value={f.colour} onChange={(v) => set("colour", v)} options={COLOURS} />
          </Field>
          <Field label="Markings">
            <input
              className={inputClass}
              placeholder="e.g. white chest"
              value={f.markings}
              onChange={(e) => set("markings", e.target.value)}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              className={inputClass}
              value={f.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
            />
          </Field>
          <Field label="Microchip no." sl>
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.microchip}
              onChange={(e) => set("microchip", e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-ink -mt-2">
          Name: use &lsquo;Unknown&rsquo; plus the date if there is no microchip. No date of birth? Pick an approximate age.
        </p>

        <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink pt-2">Profile and suitability</h3>
        <Field label="Profile — personality and best features" sl>
          <textarea
            rows={4}
            className={areaClass}
            placeholder="The more detail, the more enquiries. Add it later if you don't know the dog yet."
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field k="contactEmail" label="Case manager email" sl>
            <input
              type="email"
              inputMode="email"
              className={inputClass}
              placeholder="Gets enquiries, never public"
              value={f.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-1">
            <SL />
            Can be re-homed with…
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Field label="Kids under 5">
              <P value={f.goodWithKidsU5} onChange={(v) => set("goodWithKidsU5", v)} options={YES_NO_UNTESTED} />
            </Field>
            <Field label="Kids 5 to 12">
              <P value={f.goodWithKids5to12} onChange={(v) => set("goodWithKids5to12", v)} options={YES_NO_UNTESTED} />
            </Field>
            <Field label="Other cats">
              <P value={f.goodWithCats} onChange={(v) => set("goodWithCats", v)} options={YES_NO_UNTESTED} />
            </Field>
            <Field label="Other dogs">
              <P value={f.goodWithDogs} onChange={(v) => set("goodWithDogs", v)} options={YES_NO_UNTESTED} />
            </Field>
            <Field label="Other animals">
              <P value={f.goodWithOther} onChange={(v) => set("goodWithOther", v)} options={YES_NO_UNTESTED} />
            </Field>
          </div>
        </fieldset>

        <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink pt-2">Health</h3>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-1">
            <SL />
            Medical — what will be true at adoption
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field k="desexed" label="Desexed" required>
              <P value={f.desexed} onChange={(v) => set("desexed", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Vaccinated">
              <P value={f.vaccinated} onChange={(v) => set("vaccinated", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Wormed">
              <P value={f.wormed} onChange={(v) => set("wormed", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Heart wormed">
              <P value={f.heartworm} onChange={(v) => set("heartworm", v as YN)} options={YES_NO} />
            </Field>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Medical issues" sl>
            <input
              className={inputClass}
              placeholder="Anything an adopter should know"
              value={f.medicalIssues}
              onChange={(e) => set("medicalIssues", e.target.value)}
            />
          </Field>
          <Field label="Special needs" sl>
            <input
              className={inputClass}
              placeholder="Diet, medication, equipment"
              value={f.specialNeeds}
              onChange={(e) => set("specialNeeds", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Indoor only?" sl>
            <P value={f.indoorOnly} onChange={(v) => set("indoorOnly", v as YN)} options={YES_NO} />
          </Field>
          <Field label="Bonded pair?" sl>
            <P value={f.bondedPair} onChange={(v) => set("bondedPair", v as YN)} options={YES_NO} />
          </Field>
          <Field label="Foster carer required?" sl>
            <P value={f.fosterRequired} onChange={(v) => set("fosterRequired", v as YN)} options={YES_NO} />
          </Field>
        </div>
        {f.bondedPair === "yes" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field k="bondedPairName" label="Bonded with" required sl>
              <input className={inputClass} value={f.bondedPairName} onChange={(e) => set("bondedPairName", e.target.value)} />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Suburb" sl>
            <input className={inputClass} value={f.suburb} onChange={(e) => set("suburb", e.target.value)} />
          </Field>
          <Field label="State" sl>
            <P value={f.state} onChange={(v) => set("state", v)} options={AU_STATES} />
          </Field>
          <Field k="postcode" label="Postcode" required sl>
            <input
              inputMode="numeric"
              className={inputClass}
              value={f.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
          </Field>
          <Field label="Distance limit" sl>
            <P value={f.distance} onChange={(v) => set("distance", v)} options={DISTANCE_OPTIONS} />
          </Field>
          <Field label="Interstate adoption?" sl>
            <P value={f.interstate} onChange={(v) => set("interstate", v as YN)} options={YES_NO} />
          </Field>
          <Field k="adoptionFee" label="Adoption fee ($)" required sl>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={inputClass}
              placeholder="0 if none"
              value={f.adoptionFee}
              onChange={(e) => set("adoptionFee", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {!edit && (
        <Section
          title="Photos"
          note="Add as many as you like. The first is the main photo (and SavourLife's featured image) — a clear face works best. They upload when you save."
        >
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white text-sm font-bold"
            >
              Add photos
            </button>
            <span className="text-xs text-ink">
              {staged.length === 0
                ? "None yet."
                : `${staged.length} chosen · ${Math.min(staged.length, 10)} of 10 used on SavourLife`}
            </span>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => stagePhotos(e.target.files)}
            />
          </div>
          {staged.length > 0 && (
            <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {staged.map((p, i) => (
                <li key={p.id} className="flex flex-col gap-1">
                  <div className="relative aspect-square rounded-[var(--radius)] overflow-hidden bg-gray-tint">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                    <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold">
                        Main
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveStaged(i, -1)}
                      className="h-8 px-2 rounded border border-line-cool text-sm disabled:opacity-40"
                      aria-label="Move earlier"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={i === staged.length - 1}
                      onClick={() => moveStaged(i, 1)}
                      className="h-8 px-2 rounded border border-line-cool text-sm disabled:opacity-40"
                      aria-label="Move later"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaged((cur) => cur.filter((_, k) => k !== i))}
                      className="h-8 px-2 rounded border border-line-cool text-sm text-danger"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {(!edit || edit.showRecord) && (
        <Section title="CAPS intake record" note="From the paper Animal Intake Record. Only staff and admin see this.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field k="source" label="Source of intake" required>
              <P value={f.source} onChange={(v) => set("source", v)} options={INTAKE_SOURCES} />
            </Field>
            <Field k="reason" label="Reason for intake" required>
              <P value={f.reason} onChange={(v) => set("reason", v)} options={INTAKE_REASONS} />
            </Field>
            <Field label="More about the reason">
              <input className={inputClass} value={f.reasonNote} onChange={(e) => set("reasonNote", e.target.value)} />
            </Field>
          </div>
          {SOURCES_WITH_PERSON.includes(f.source) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Surrendered by">
                <input
                  className={inputClass}
                  placeholder="Name and phone"
                  value={f.surrenderedBy}
                  onChange={(e) => set("surrenderedBy", e.target.value)}
                />
              </Field>
            </div>
          )}

          <h3 className="text-sm font-extrabold pt-1">Initial health check</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field k="condition" label="Condition" required>
              <P value={f.condition} onChange={(v) => set("condition", v)} options={CONDITIONS} />
            </Field>
            <Field k="parasites" label="Parasites seen?" required>
              <P value={f.parasites} onChange={(v) => set("parasites", v as YN)} options={YES_NO} />
            </Field>
            <Field label="Injuries / illness">
              <input
                className={inputClass}
                placeholder="Blank if none"
                value={f.visibleInjuries}
                onChange={(e) => set("visibleInjuries", e.target.value)}
              />
            </Field>
            <Field k="vaccinationGiven" label="Vaccination given?" required>
              <P value={f.vaccinationGiven} onChange={(v) => set("vaccinationGiven", v as YN)} options={YES_NO} />
            </Field>
            <Field k="fleaTickWormGiven" label="Flea / tick / worm given?" required>
              <P value={f.fleaTickWormGiven} onChange={(v) => set("fleaTickWormGiven", v as YN)} options={YES_NO} />
            </Field>
            {f.vaccinationGiven === "yes" && (
              <Field k="vaccinationType" label="Vaccination type" required>
                <P value={f.vaccinationType} onChange={(v) => set("vaccinationType", v)} options={VACCINE_TYPES} />
              </Field>
            )}
          </div>

          <h3 className="text-sm font-extrabold pt-1">Initial behaviour assessment</h3>
          <fieldset
            data-key="behaviour"
            className={`flex flex-wrap gap-2 ${issues.some((i) => i.key === "behaviour") ? "rounded-[var(--radius)] ring-2 ring-danger/40 p-2" : ""}`}
          >
            <legend className="text-sm font-semibold mb-1">
              Tick all that apply
              <Star />
            </legend>
            {BEHAVIOUR_OPTIONS.map(([code, label]) => (
              <label
                key={code}
                className={`flex items-center gap-2 text-sm px-4 h-10 rounded-[var(--radius)] border cursor-pointer ${
                  f.behaviour.includes(code) ? "border-brand bg-brand-tint font-semibold" : "border-line-cool"
                }`}
              >
                <input type="checkbox" checked={f.behaviour.includes(code)} onChange={() => toggleBehaviour(code)} />
                {label}
              </label>
            ))}
          </fieldset>
          {f.behaviour.includes("other") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field k="behaviourOther" label="What other behaviour?" required>
                <input className={inputClass} value={f.behaviourOther} onChange={(e) => set("behaviourOther", e.target.value)} />
              </Field>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.experiencedOnly}
              onChange={(e) => set("experiencedOnly", e.target.checked)}
            />
            Experienced handlers only (volunteers will see this on the dog)
          </label>

          <Field label="Notes">
            <textarea rows={3} className={areaClass} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </Section>
      )}

      {!edit && (
        <Section
          title="Sign-off"
          note="Completed by an admin. Filled in from your sign-in; change it only if someone else did the intake."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Intake officer">
              <input className={inputClass} value={f.officerName} onChange={(e) => set("officerName", e.target.value)} />
            </Field>
            <Field k="signedName" label="Signed (typed name)" required>
              <input className={inputClass} value={f.signedName} onChange={(e) => set("signedName", e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {summary && <div>{summary}</div>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* The same buttons again at the end, so nobody scrolls back up after filling the long form. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
        >
          {isPending ? "Saving…" : edit ? "Save changes" : "Save intake"}
        </button>
        {edit && (
          <button
            type="button"
            onClick={() => router.push(`/dogs/${edit.dogId}`)}
            className="h-12 px-6 rounded-[var(--radius)] border border-line-cool font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="h-12 px-4 text-sm font-semibold text-brand-ink underline ml-auto"
        >
          ↑ Back to top{edit ? " (photos)" : ""}
        </button>
      </div>
    </form>
    </IssueKeys.Provider>
  );
}
