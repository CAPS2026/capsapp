"use server";

// Admin-only changes to medications and vet appointments. (Recording a
// dose on a shift is in actions/shift.ts, with the other checklist actions.)

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { shelterToday } from "@/lib/shift";

type Result = { error?: string };

async function requireAdmin() {
  const me = await getCurrentPerson();
  return me?.isAdmin && me.id ? me : null;
}

function bust() {
  revalidatePath("/shift", "layout");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export type MedicationInput = {
  dogName: string;
  medicine: string;
  howGiven: string;
  parts: "morning" | "afternoon" | "both";
  frequency: "daily" | "weekly" | "monthly";
  weekdays: number[];
  dayOfMonth: number | null;
  startDate: string;
  endDate: string;
  notes: string;
};

/** Add a medication, or change one (`id`). */
export async function saveMedication(input: MedicationInput, id?: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const dogName = input.dogName.trim();
  const medicine = input.medicine.trim();
  if (!dogName) return { error: "Enter the dog's name." };
  if (!medicine) return { error: "Enter the medication and dose." };
  if (!["morning", "afternoon", "both"].includes(input.parts)) return { error: "Choose which shift." };
  if (!["daily", "weekly", "monthly"].includes(input.frequency)) return { error: "Choose how often." };
  const weekdays = [...new Set(input.weekdays.filter((d) => d >= 0 && d <= 6))].sort();
  if (input.frequency === "weekly" && weekdays.length === 0) return { error: "Choose at least one day of the week." };
  if (input.frequency === "monthly" && !(input.dayOfMonth && input.dayOfMonth >= 1 && input.dayOfMonth <= 31))
    return { error: "Choose the day of the month." };
  if (!DATE_RE.test(input.startDate)) return { error: "Enter the start date." };
  if (input.endDate && !DATE_RE.test(input.endDate)) return { error: "The end date doesn't look right." };
  if (input.endDate && input.endDate < input.startDate) return { error: "The end date can't be before the start date." };

  const row = {
    dog_name: dogName,
    medicine,
    how_given: input.howGiven.trim() || null,
    parts: input.parts,
    frequency: input.frequency,
    weekdays: input.frequency === "weekly" ? weekdays : [],
    day_of_month: input.frequency === "monthly" ? input.dayOfMonth : null,
    start_date: input.startDate,
    end_date: input.endDate || null,
    notes: input.notes.trim() || null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("medication").update(row).eq("id", id)
    : await supabase.from("medication").insert({ ...row, created_by: me.id });
  if (error) return { error: error.message };
  bust();
  return {};
}

/** Stop a medication from today. Its doses so far stay on record. */
export async function stopMedication(id: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("medication")
    .update({ stopped_at: new Date().toISOString(), end_date: shelterToday() })
    .eq("id", id);
  if (error) return { error: error.message };
  bust();
  return {};
}

export type VetInput = {
  date: string;
  dogName: string;
  /** "HH:MM", or "" when it is just morning or afternoon. */
  time: string;
  part: "morning" | "afternoon";
  kind: "admit" | "discharge" | "consult" | "other";
  reason: string;
  instructions: string;
};

/** Add a vet appointment, or change one (`id`). A time before 12:00 is a
 *  morning appointment, from 12:00 an afternoon one. */
export async function saveVetAppointment(input: VetInput, id?: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  if (!DATE_RE.test(input.date)) return { error: "Enter the date." };
  const dogName = input.dogName.trim();
  if (!dogName) return { error: "Enter the dog's name." };
  if (input.time && !TIME_RE.test(input.time)) return { error: "The time doesn't look right." };
  if (!["admit", "discharge", "consult", "other"].includes(input.kind)) return { error: "Choose the type." };
  const part = input.time ? (Number(input.time.slice(0, 2)) < 12 ? "morning" : "afternoon") : input.part;
  if (part !== "morning" && part !== "afternoon") return { error: "Choose morning or afternoon." };

  const row = {
    date: input.date,
    dog_name: dogName,
    time: input.time || null,
    part,
    kind: input.kind,
    reason: input.reason.trim() || null,
    instructions: input.instructions.trim() || null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("vet_appointment").update(row).eq("id", id)
    : await supabase.from("vet_appointment").insert({ ...row, created_by: me.id });
  if (error) return { error: error.message };
  bust();
  return {};
}

/** Delete an appointment entered by mistake. Its checklist tasks go with it. */
export async function deleteVetAppointment(id: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const supabase = await createClient();
  const { error } = await supabase.from("vet_appointment").delete().eq("id", id);
  if (error) return { error: error.message };
  bust();
  return {};
}
