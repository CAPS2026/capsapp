"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hhmm, parseYmd } from "@/lib/shift";
import {
  deleteVetAppointment,
  saveMedication,
  saveVetAppointment,
  stopMedication,
  type MedicationInput,
  type VetInput,
} from "@/lib/actions/care";
import type { Medication, VetAppointment } from "@/lib/care-data";

const FIELD = "h-11 w-full rounded-[var(--radius)] border border-line-cool bg-white px-3 text-base font-normal";
const AREA = "w-full rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-base font-normal";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Julie's colours for these two admin pages: Edit bright purple, Stop and
// Delete bright green, both filled with white bold writing; the Add button
// a large orange.
const EDIT_BTN = "inline-flex h-10 items-center rounded-[var(--radius)] bg-[#7C3AED] px-4 text-sm font-extrabold text-white";
const STOP_BTN = "inline-flex h-10 items-center rounded-[var(--radius)] bg-[#16A34A] px-4 text-sm font-extrabold text-white";

// The pink of medications and the vet on the checklist, for these pages too.
const PINK = "#B0306A";
const PINK_TINT = "#FBE9F1";
const PINK_INK = "#7E1F4A";
const FORM_TINT = "#FDF1F6";
const FORM_BORDER = "#E9B8CF";
// Appointment type tags.
const KIND_COLOUR: Record<"admit" | "discharge" | "consult" | "other", string> = {
  admit: "#2563EB",
  discharge: "#16A34A",
  consult: "#D97706",
  other: "#6B7280",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-bold">{label}</span>
      {children}
    </label>
  );
}

function DogNames({ names }: { names: string[] }) {
  return (
    <datalist id="caps-dog-names">
      {names.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
}

const dayLabel = (d: string) => parseYmd(d).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

function medWhen(m: Medication): string {
  const shift = m.parts === "both" ? "Morning and afternoon" : m.parts === "morning" ? "Morning" : "Afternoon";
  const often =
    m.frequency === "daily"
      ? "every day"
      : m.frequency === "every_second_day"
        ? "every second day"
        : m.frequency === "weekly"
        ? m.weekdays.map((d) => DAYS[d]).join(", ")
        : `monthly, the ${m.dayOfMonth}${[1, 21, 31].includes(m.dayOfMonth ?? 0) ? "st" : [2, 22].includes(m.dayOfMonth ?? 0) ? "nd" : [3, 23].includes(m.dayOfMonth ?? 0) ? "rd" : "th"}`;
  return `${shift}, ${often}`;
}

/** Every current medication, one card per dog, with Edit and Stop. */
export function MedicationList({ meds }: { meds: Medication[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dogs = [...new Set(meds.map((m) => m.dogName))];

  if (meds.length === 0) return <p className="m-0 text-sm text-ink-muted">No dogs are on medication.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      {dogs.map((dog) => (
        <div key={dog} className="overflow-hidden rounded-[var(--radius)] border border-line bg-card" style={{ borderLeft: `6px solid ${PINK}` }}>
          <h3 className="m-0 px-3.5 py-2.5 text-[17px] font-extrabold" style={{ background: PINK_TINT, color: PINK_INK }}>
            {dog}
          </h3>
          {meds
            .filter((m) => m.dogName === dog)
            .map((m) => (
              <div key={m.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-line px-3.5 py-2.5">
                <div className="min-w-0 text-sm">
                  <div className="font-extrabold">{m.medicine}</div>
                  {m.howGiven && <div className="text-ink-muted">{m.howGiven}</div>}
                  <div>{medWhen(m)}</div>
                  <div className="text-ink-muted">
                    From {dayLabel(m.startDate)}
                    {m.endDate ? ` until ${dayLabel(m.endDate)}` : ", ongoing"}
                  </div>
                  {m.notes && <div className="text-ink-muted">{m.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/shift/medications?edit=${m.id}`} className={EDIT_BTN}>
                    Edit
                  </Link>
                  {confirm === m.id ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await stopMedication(m.id);
                          if (r.error) setError(r.error);
                          else {
                            setConfirm(null);
                            router.refresh();
                          }
                        })
                      }
                      className={`${STOP_BTN} disabled:opacity-50`}
                    >
                      Yes, stop it
                    </button>
                  ) : (
                    <button type="button" onClick={() => setConfirm(m.id)} className={STOP_BTN}>
                      Stop
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

/** Add a medication, or edit one (`med`). */
export function MedicationForm({ med, dogNames }: { med?: Medication; dogNames: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<MedicationInput>({
    dogName: med?.dogName ?? "",
    medicine: med?.medicine ?? "",
    howGiven: med?.howGiven ?? "",
    parts: med?.parts ?? "morning",
    frequency: med?.frequency ?? "daily",
    weekdays: med?.weekdays ?? [],
    dayOfMonth: med?.dayOfMonth ?? null,
    startDate: med?.startDate ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(new Date()),
    endDate: med?.endDate ?? "",
    notes: med?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = <K extends keyof MedicationInput>(k: K, v: MedicationInput[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setSaved(null);
  };

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await saveMedication(f, med?.id);
      if (r.error) setError(r.error);
      else if (med) router.push("/shift/medications");
      else {
        setSaved(`Saved: ${f.dogName.trim()}, ${f.medicine.trim()}.`);
        setF((x) => ({ ...x, medicine: "", howGiven: "", notes: "" }));
        router.refresh();
      }
    });
  }

  return (
    <div id="add" className="flex scroll-mt-4 flex-col gap-3 rounded-[var(--radius)] border-[1.5px] p-4" style={{ background: FORM_TINT, borderColor: FORM_BORDER }}>
      <h3 className="m-0 text-[17px] font-extrabold" style={{ color: PINK_INK }}>{med ? `Edit: ${med.dogName}` : "Add medication"}</h3>
      <Field label="Dog's name">
        <input className={FIELD} list="caps-dog-names" autoComplete="off" value={f.dogName} onChange={(e) => set("dogName", e.target.value)} />
      </Field>
      <DogNames names={dogNames} />
      <Field label="Medication and dose">
        <input className={FIELD} placeholder="e.g. Apoquel 16mg, 1 tablet" value={f.medicine} onChange={(e) => set("medicine", e.target.value)} />
      </Field>
      <Field label="How it's given">
        <input className={FIELD} placeholder="e.g. with food, crushed in meat" value={f.howGiven} onChange={(e) => set("howGiven", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Which shift">
          <select className={FIELD} value={f.parts} onChange={(e) => set("parts", e.target.value as MedicationInput["parts"])}>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="both">Morning and afternoon</option>
          </select>
        </Field>
        <Field label="How often">
          <select className={FIELD} value={f.frequency} onChange={(e) => set("frequency", e.target.value as MedicationInput["frequency"])}>
            <option value="daily">Every day</option>
            <option value="every_second_day">Every second day (from the start date)</option>
            <option value="weekly">Certain days of the week</option>
            <option value="monthly">Once a month</option>
          </select>
        </Field>
      </div>
      {f.frequency === "weekly" && (
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => set("weekdays", f.weekdays.includes(i) ? f.weekdays.filter((x) => x !== i) : [...f.weekdays, i])}
              className={`h-9 rounded-[var(--radius)] border-[1.5px] px-3 text-sm font-bold ${
                f.weekdays.includes(i) ? "border-brand bg-brand-tint text-brand-ink" : "border-line bg-card"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      {f.frequency === "monthly" && (
        <Field label="Day of the month">
          <input
            type="number"
            min={1}
            max={31}
            className={FIELD}
            value={f.dayOfMonth ?? ""}
            onChange={(e) => set("dayOfMonth", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" className={FIELD} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="End date (empty if ongoing)">
          <input type="date" className={FIELD} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows={2} className={AREA} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      {saved && <p className="m-0 text-sm font-semibold text-ok">{saved}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={isPending} onClick={save} className="h-11 flex-1 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50">
          {isPending ? "Saving…" : "Save"}
        </button>
        {med && (
          <Link href="/shift/medications" className="inline-flex h-11 items-center rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vet appointments
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<VetInput["kind"], string> = { admit: "Admit", discharge: "Discharge", consult: "Consult", other: "Other" };

/** Coming up, by date, with Edit and Delete. */
export function VetList({ appts }: { appts: VetAppointment[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (appts.length === 0) return <p className="m-0 text-sm text-ink-muted">No appointments coming up.</p>;
  return (
    <div className="flex flex-col gap-2">
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      {appts.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-card p-2.5">
          {/* Date badge: day of the week over the day of the month. */}
          <div className="flex w-[62px] shrink-0 flex-col items-center rounded-[10px] py-1.5 text-white" style={{ background: PINK }}>
            <span className="text-[11px] font-extrabold tracking-[0.08em]">
              {parseYmd(a.date).toLocaleDateString("en-AU", { weekday: "short" }).toUpperCase()}
            </span>
            <span className="text-2xl font-extrabold leading-tight">{parseYmd(a.date).getDate()}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold">
              {a.dogName}
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white" style={{ background: KIND_COLOUR[a.kind] }}>
                {KIND_LABEL[a.kind]}
              </span>
              <span className="text-xs font-semibold text-ink-muted">
                {a.time ? hhmm(a.time) : a.part === "morning" ? "Morning" : "Afternoon"}
              </span>
            </div>
            {a.reason && <div>{a.reason}</div>}
            {a.instructions && (
              <div className="font-extrabold" style={{ color: PINK_INK }}>
                {a.instructions}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/shift/vet?edit=${a.id}`} className={EDIT_BTN}>
              Edit
            </Link>
            {confirm === a.id ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteVetAppointment(a.id);
                    if (r.error) setError(r.error);
                    else {
                      setConfirm(null);
                      router.refresh();
                    }
                  })
                }
                className={`${STOP_BTN} disabled:opacity-50`}
              >
                Yes, delete
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm(a.id)} className={STOP_BTN}>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Add an appointment ("Save and add another" keeps the date), or edit one. */
export function VetForm({ appt, dogNames, today }: { appt?: VetAppointment; dogNames: string[]; today: string }) {
  const router = useRouter();
  const blank = (date: string): VetInput => ({ date, dogName: "", time: "", part: "morning", kind: "admit", reason: "", instructions: "" });
  const [f, setF] = useState<VetInput>(
    appt
      ? {
          date: appt.date,
          dogName: appt.dogName,
          time: appt.time ?? "",
          part: appt.part,
          kind: appt.kind,
          reason: appt.reason ?? "",
          instructions: appt.instructions ?? "",
        }
      : blank(today),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = <K extends keyof VetInput>(k: K, v: VetInput[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setSaved(null);
  };

  function save(another: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await saveVetAppointment(f, appt?.id);
      if (r.error) {
        setError(r.error);
        return;
      }
      if (appt || !another) {
        router.push("/shift/vet");
        router.refresh();
        return;
      }
      setSaved(`Saved: ${f.dogName.trim()}, ${dayLabel(f.date)}.`);
      setF(blank(f.date));
      router.refresh();
    });
  }

  return (
    <div id="add" className="flex scroll-mt-4 flex-col gap-3 rounded-[var(--radius)] border-[1.5px] p-4" style={{ background: FORM_TINT, borderColor: FORM_BORDER }}>
      <h3 className="m-0 text-[17px] font-extrabold" style={{ color: PINK_INK }}>{appt ? `Edit: ${appt.dogName}` : "Add appointment"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className={FIELD} value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Dog's name">
          <input className={FIELD} list="caps-dog-names" autoComplete="off" value={f.dogName} onChange={(e) => set("dogName", e.target.value)} />
        </Field>
        <Field label="Time (leave empty if not known)">
          <input type="time" className={FIELD} value={f.time} onChange={(e) => set("time", e.target.value)} />
        </Field>
        {f.time ? (
          <Field label="Shift">
            <input className={`${FIELD} bg-gray-tint`} readOnly value={Number(f.time.slice(0, 2)) < 12 ? "Morning" : "Afternoon"} />
          </Field>
        ) : (
          <Field label="Shift">
            <select className={FIELD} value={f.part} onChange={(e) => set("part", e.target.value as VetInput["part"])}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </Field>
        )}
        <Field label="Type">
          <select className={FIELD} value={f.kind} onChange={(e) => set("kind", e.target.value as VetInput["kind"])}>
            <option value="admit">Admit</option>
            <option value="discharge">Discharge</option>
            <option value="consult">Consult</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      <DogNames names={dogNames} />
      <Field label="What it's for">
        <input className={FIELD} placeholder="e.g. Day 60 heartworm recheck" value={f.reason} onChange={(e) => set("reason", e.target.value)} />
      </Field>
      <Field label="Special instructions">
        <input className={FIELD} placeholder="e.g. OVERNIGHT STAY. NO BREAKFAST." value={f.instructions} onChange={(e) => set("instructions", e.target.value)} />
      </Field>
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      {saved && <p className="m-0 text-sm font-semibold text-ok">{saved}</p>}
      <div className="flex flex-wrap gap-2">
        {!appt && (
          <button type="button" disabled={isPending} onClick={() => save(true)} className="h-11 rounded-[var(--radius)] bg-brand px-4 text-sm font-bold text-white disabled:opacity-50">
            {isPending ? "Saving…" : "Save and add another"}
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => save(false)}
          className={`h-11 rounded-[var(--radius)] px-4 text-sm font-bold disabled:opacity-50 ${appt ? "bg-brand text-white" : "border-[1.5px] border-brand text-brand-ink"}`}
        >
          {appt ? (isPending ? "Saving…" : "Save") : "Save and close"}
        </button>
        {appt && (
          <Link href="/shift/vet" className="inline-flex h-11 items-center rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}
