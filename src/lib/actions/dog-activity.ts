"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";

type ActionResult = { error: string } | { error?: undefined };

/** Postgres error -> a message a volunteer can actually act on. */
function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "This dog already has an open activity — refresh and try again.";
  return error.message;
}

/**
 * The one-tap fast path (docs/ui-flows.md §4): walk out, right now, with the
 * signed-in person as the walker. RLS (`da_insert`) is what actually enforces
 * "a volunteer can only log a walk for themselves" — this just supplies the
 * values; a rejected insert surfaces as a normal Postgres error.
 */
export async function startWalk(dogId: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("dog_activity").insert({
    dog_id: dogId,
    type: "walk",
    person_id: person.id,
    started_at: new Date().toISOString(),
  });

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${dogId}`);
  return {};
}

type BringInResult =
  | { error: string; closed?: undefined }
  | { error?: undefined; closed: { id: string; startedAt: string; endedAt: string } };

/**
 * The one-tap fast path (docs/ui-flows.md §5): closes whichever activity is
 * currently open for the dog. RLS (`da_update`) only allows this for staff or
 * the person the open activity belongs to. Returns the closed row so the
 * caller can immediately offer "wrong time? edit" right at the point of
 * action — the actual return time is very often not "now" (Paul's
 * real-world case, 2026-09-06: brought a dog in earlier, only got to the
 * app later, End Yard booked her out at click-time instead).
 */
export async function bringDogIn(dogId: string): Promise<BringInResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dog_activity")
    .update({ ended_at: new Date().toISOString() })
    .eq("dog_id", dogId)
    .is("ended_at", null)
    .select("id, started_at, ended_at")
    .maybeSingle();

  if (error) return { error: friendlyError(error) };
  if (!data) return { error: "Nothing to bring in — no open activity for this dog." };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${dogId}`);
  return { closed: { id: data.id, startedAt: data.started_at, endedAt: data.ended_at! } };
}

/**
 * Fix the times on an existing activity row (docs/ui-flows.md §6, "Wrong
 * time on an existing record"). RLS (`da_update`) allows this for staff on
 * any row, or a volunteer on their own. Always flags the row `edited`.
 */
export async function editActivityTimes(input: {
  activityId: string;
  dogId: string;
  startedAt: string;
  endedAt: string | null;
  notes: string;
}): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const startedAt = new Date(input.startedAt);
  const endedAt = input.endedAt ? new Date(input.endedAt) : null;
  const now = new Date();
  if (Number.isNaN(startedAt.getTime())) return { error: "Enter a valid start time." };
  if (endedAt && Number.isNaN(endedAt.getTime())) return { error: "Enter a valid end time." };
  if (startedAt > now || (endedAt && endedAt > now)) return { error: "Times can't be in the future." };
  if (endedAt && endedAt < startedAt) return { error: "The end time must be after the start time." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dog_activity")
    .update({
      started_at: startedAt.toISOString(),
      ended_at: endedAt ? endedAt.toISOString() : null,
      notes: input.notes.trim() || null,
      edited_at: now.toISOString(),
      edited_by: person.id,
    })
    .eq("id", input.activityId);

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${input.dogId}`);
  return {};
}

/** Active volunteers, for the Manual entry form's person picker (staff only). */
export async function listActiveVolunteers(): Promise<{ id: string; name: string }[]> {
  const person = await getCurrentPerson();
  if (!person || !person.isStaff) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("person_roles")
    .select("person:people!person_roles_person_id_fkey(id, first_name, surname)")
    .eq("role", "volunteer")
    .eq("status", "active");

  return ((data ?? []) as unknown as Array<{ person: { id: string; first_name: string; surname: string } }>)
    .map((r) => ({ id: r.person.id, name: `${r.person.first_name} ${r.person.surname}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active carers of the given type, for the Start Jail Break/Foster form (staff only). */
export async function listActiveCarers(type: "jail_break" | "foster"): Promise<{ id: string; name: string }[]> {
  const person = await getCurrentPerson();
  if (!person || !person.isStaff) return [];

  const role = type === "jail_break" ? "jailbreak_carer" : "foster_carer";
  const supabase = await createClient();
  const { data } = await supabase
    .from("person_roles")
    .select("person:people!person_roles_person_id_fkey(id, first_name, surname)")
    .eq("role", role)
    .eq("status", "active");

  return ((data ?? []) as unknown as Array<{ person: { id: string; first_name: string; surname: string } }>)
    .map((r) => ({ id: r.person.id, name: `${r.person.first_name} ${r.person.surname}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Start Yard / Bed Rest / Jail Break / Foster — docs/ui-flows.md §4 full
 * path, for the activity types the one-tap fast path doesn't cover.
 * Staff only: RLS (`da_insert`) only allows non-walk types for staff, so
 * this checks the same thing up front for a clean error rather than a raw
 * RLS rejection.
 */
export async function startPlacement(input: {
  dogId: string;
  type: "yard" | "bed_rest" | "jail_break" | "foster";
  personId?: string;
  dueBack?: string;
  reason?: string;
  notes?: string;
}): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };
  if (!person.isStaff) return { error: "Only staff can start this." };

  if ((input.type === "jail_break" || input.type === "foster") && !input.personId) {
    return { error: "Pick a carer." };
  }
  // Every type here gets a due-back (Yard included, so a caretaker can be
  // alerted when a dog is overdue to come in).
  if (!input.dueBack) {
    return { error: "Expected end is required." };
  }
  if (input.type === "bed_rest" && !input.reason?.trim()) {
    return { error: "Reason is required for bed rest." };
  }

  let dueBackIso: string | null = null;
  if (input.dueBack) {
    const dueBack = new Date(input.dueBack);
    if (Number.isNaN(dueBack.getTime())) return { error: "Enter a valid due-back date/time." };
    if (dueBack <= new Date()) return { error: "Due back must be in the future." };
    dueBackIso = dueBack.toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("dog_activity").insert({
    dog_id: input.dogId,
    type: input.type,
    person_id: input.personId ?? null,
    placed_by: person.id,
    started_at: new Date().toISOString(),
    due_back: dueBackIso,
    reason: input.reason?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${input.dogId}`);
  return {};
}

/**
 * Manual entry (docs/ui-flows.md §6, "Dog was walked, never checked out") —
 * the old app's own name for this (`Is_Manual_Entry` on the Walks table) is
 * kept here rather than inventing new wording. Always recorded as
 * `entered_late` since by definition it's added after the fact.
 */
export async function logManualWalk(input: {
  dogId: string;
  personId: string;
  checkOut: string;
  checkIn: string;
  notes: string;
}): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };
  if (!person.isStaff && input.personId !== person.id) {
    return { error: "You can only log a walk for yourself." };
  }

  const checkOut = new Date(input.checkOut);
  const checkIn = new Date(input.checkIn);
  const now = new Date();
  if (Number.isNaN(checkOut.getTime()) || Number.isNaN(checkIn.getTime())) {
    return { error: "Enter both a Check Out and a Check In time." };
  }
  if (checkIn < checkOut) return { error: "Check In must be after Check Out." };
  if (checkOut > now || checkIn > now) return { error: "Times can't be in the future." };

  const hoursBack = (now.getTime() - checkOut.getTime()) / 3_600_000;
  if (hoursBack > 48 && !person.isStaff && !input.notes.trim()) {
    return { error: "That's more than 48 hours ago — add a note explaining why, or ask a staff member to log it." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("dog_activity").insert({
    dog_id: input.dogId,
    type: "walk",
    person_id: input.personId,
    started_at: checkOut.toISOString(),
    ended_at: checkIn.toISOString(),
    entered_late: true,
    notes: input.notes.trim() || null,
  });

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${input.dogId}`);
  return {};
}
