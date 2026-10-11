// Medications, vet appointments, the volunteer count and handover ticks:
// the staff app's own reads (never the dog app's data). Server only.

import { shiftDb } from "@/lib/shift-db";
import { initials, parseYmd, type Part } from "@/lib/shift";

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export type MedParts = "morning" | "afternoon" | "both";
export type MedFrequency = "daily" | "every_second_day" | "weekly" | "monthly";

export type Medication = {
  id: string;
  dogName: string;
  medicine: string;
  howGiven: string | null;
  parts: MedParts;
  frequency: MedFrequency;
  weekdays: number[];
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  stoppedAt: string | null;
  /** A caretaker has told Shayna the course looks finished (see flagCourseFinished). */
  finishFlaggedAt: string | null;
  finishFlaggedBy: string | null;
  finishNote: string | null;
};

// One plain string (not joined pieces), so the query's result type stays simple.
const MED_SELECT = "id, dog_name, medicine, how_given, parts, frequency, weekdays, day_of_month, start_date, end_date, notes, stopped_at, finish_flagged_at, finish_flagged_by, finish_note";

type RawMed = {
  id: string;
  dog_name: string;
  medicine: string;
  how_given: string | null;
  parts: MedParts;
  frequency: MedFrequency;
  weekdays: number[] | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  stopped_at: string | null;
  finish_flagged_at: string | null;
  finish_flagged_by: string | null;
  finish_note: string | null;
};

function toMed(r: RawMed): Medication {
  return {
    id: r.id,
    dogName: r.dog_name,
    medicine: r.medicine,
    howGiven: r.how_given,
    parts: r.parts,
    frequency: r.frequency,
    weekdays: r.weekdays ?? [],
    dayOfMonth: r.day_of_month,
    startDate: r.start_date,
    endDate: r.end_date,
    notes: r.notes,
    stoppedAt: r.stopped_at,
    finishFlaggedAt: r.finish_flagged_at,
    finishFlaggedBy: r.finish_flagged_by,
    finishNote: r.finish_note,
  };
}

/** Whether a medication has a dose due on `date` ("YYYY-MM-DD") in `part`. */
export function medDueOn(m: Medication, date: string, part: Part): boolean {
  if (m.stoppedAt) return false;
  if (date < m.startDate) return false;
  if (m.endDate && date > m.endDate) return false;
  if (m.parts !== "both" && m.parts !== part) return false;
  const d = parseYmd(date);
  // Every second day, counted from the start date (the start date is a dose
  // day), e.g. the last weeks of a heartworm course.
  if (m.frequency === "every_second_day") {
    const s = parseYmd(m.startDate);
    const days = Math.round(
      (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())) / 86400000,
    );
    return days % 2 === 0;
  }
  if (m.frequency === "weekly") return m.weekdays.includes(d.getDay());
  if (m.frequency === "monthly") {
    if (!m.dayOfMonth) return false;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return d.getDate() === Math.min(m.dayOfMonth, last);
  }
  return true;
}

/** Every medication not stopped (for the admin page), by dog. */
export async function listMedications(): Promise<Medication[]> {
  const supabase = await shiftDb();
  const { data, error } = await supabase
    .from("medication")
    .select(MED_SELECT)
    .is("stopped_at", null)
    .order("dog_name")
    .order("created_at");
  if (error) console.error("listMedications failed", error);
  return ((data ?? []) as unknown as RawMed[]).map(toMed);
}

export async function getMedication(id: string): Promise<Medication | null> {
  const supabase = await shiftDb();
  const { data } = await supabase.from("medication").select(MED_SELECT).eq("id", id).maybeSingle();
  return data ? toMed(data as unknown as RawMed) : null;
}

export type DoseReason = "refused" | "vomited" | "away" | "other";
export const DOSE_REASON_LABEL: Record<DoseReason, string> = {
  refused: "Refused",
  vomited: "Vomited it up",
  away: "Dog is away (vet, foster)",
  other: "Other",
};

export type DueDose = {
  medication: Medication;
  /** Null until someone records it. */
  status: "given" | "not_given" | null;
  reason: DoseReason | null;
  note: string | null;
  byName: string | null;
  byInitials: string | null;
  at: string | null;
};

/** Doses due on (date, part), with what has been recorded for each. */
export async function getDueDoses(date: string, part: Part): Promise<DueDose[]> {
  const supabase = await shiftDb();
  const [{ data: meds, error }, { data: doses }] = await Promise.all([
    supabase.from("medication").select(MED_SELECT).is("stopped_at", null).lte("start_date", date),
    supabase
      .from("medication_dose")
      .select("medication_id, status, reason, note, actioned_at, person:people!medication_dose_actioned_by_fkey(first_name, surname)")
      .eq("date", date)
      .eq("part", part),
  ]);
  if (error) console.error("getDueDoses failed", error);
  const byMed = new Map(
    ((doses ?? []) as unknown as Array<{
      medication_id: string;
      status: "given" | "not_given";
      reason: DoseReason | null;
      note: string | null;
      actioned_at: string;
      person: { first_name: string; surname: string } | null;
    }>).map((d) => [d.medication_id, d]),
  );
  return ((meds ?? []) as unknown as RawMed[])
    .map(toMed)
    .filter((m) => medDueOn(m, date, part))
    .sort((a, b) => a.dogName.localeCompare(b.dogName))
    .map((m) => {
      const d = byMed.get(m.id);
      return {
        medication: m,
        status: d?.status ?? null,
        reason: d?.reason ?? null,
        note: d?.note ?? null,
        byName: d?.person ? `${d.person.first_name} ${d.person.surname}`.trim() : null,
        byInitials: d?.person ? initials(d.person.first_name, d.person.surname) : null,
        at: d?.actioned_at ?? null,
      };
    });
}

// ---------------------------------------------------------------------------
// Vet appointments
// ---------------------------------------------------------------------------

export type VetKind = "admit" | "discharge" | "consult" | "other";
export const VET_KIND_LABEL: Record<VetKind, string> = {
  admit: "Admit",
  discharge: "Discharge",
  consult: "Consult",
  other: "Other",
};

export type VetAppointment = {
  id: string;
  date: string;
  dogName: string;
  time: string | null;
  part: Part;
  kind: VetKind;
  reason: string | null;
  instructions: string | null;
};

type RawAppt = {
  id: string;
  date: string;
  dog_name: string;
  time: string | null;
  part: Part;
  kind: VetKind;
  reason: string | null;
  instructions: string | null;
};

function toAppt(r: RawAppt): VetAppointment {
  return {
    id: r.id,
    date: r.date,
    dogName: r.dog_name,
    time: r.time ? String(r.time).slice(0, 5) : null,
    part: r.part,
    kind: r.kind,
    reason: r.reason,
    instructions: r.instructions,
  };
}

/** Appointments from `from` to `to` inclusive, by date then time. */
export async function getVetAppointments(from: string, to: string): Promise<VetAppointment[]> {
  const supabase = await shiftDb();
  const { data, error } = await supabase
    .from("vet_appointment")
    .select("id, date, dog_name, time, part, kind, reason, instructions")
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("part")
    .order("time", { nullsFirst: false });
  if (error) console.error("getVetAppointments failed", error);
  return ((data ?? []) as RawAppt[]).map(toAppt).sort((a, b) =>
    a.date !== b.date
      ? a.date.localeCompare(b.date)
      : a.part !== b.part
        ? a.part === "morning"
          ? -1
          : 1
        : (a.time ?? "99").localeCompare(b.time ?? "99"),
  );
}

export async function getVetAppointment(id: string): Promise<VetAppointment | null> {
  const supabase = await shiftDb();
  const { data } = await supabase
    .from("vet_appointment")
    .select("id, date, dog_name, time, part, kind, reason, instructions")
    .eq("id", id)
    .maybeSingle();
  return data ? toAppt(data as RawAppt) : null;
}

// ---------------------------------------------------------------------------
// Volunteers and handover
// ---------------------------------------------------------------------------

/** The volunteer count for (date, part), null if nobody has entered it. */
export async function getVolunteerCount(date: string, part: Part): Promise<number | null> {
  const supabase = await shiftDb();
  const { data } = await supabase
    .from("roster_session")
    .select("volunteer_count")
    .eq("date", date)
    .eq("part", part)
    .maybeSingle();
  return (data?.volunteer_count as number | null | undefined) ?? null;
}

/** How many handover notes are not ticked off yet. */
export async function getOpenHandoverCount(): Promise<number> {
  const supabase = await shiftDb();
  const { count } = await supabase.from("handover_note").select("id", { count: "exact", head: true }).is("done_at", null);
  return count ?? 0;
}

/** Dog names typed before in the staff app (health concerns, medications,
 *  vet appointments), for suggestions while typing. */
export async function getAllDogNames(): Promise<string[]> {
  const supabase = await shiftDb();
  const [a, b, c] = await Promise.all([
    supabase.from("health_concern").select("dog_name").not("dog_name", "is", null).limit(1000),
    supabase.from("medication").select("dog_name").limit(1000),
    supabase.from("vet_appointment").select("dog_name").limit(1000),
  ]);
  const byKey = new Map<string, string>();
  for (const r of [...(a.data ?? []), ...(b.data ?? []), ...(c.data ?? [])] as Array<{ dog_name: string | null }>) {
    const n = (r.dog_name ?? "").trim();
    if (n && !byKey.has(n.toLowerCase())) byKey.set(n.toLowerCase(), n);
  }
  return [...byKey.values()].sort((x, y) => x.localeCompare(y));
}
