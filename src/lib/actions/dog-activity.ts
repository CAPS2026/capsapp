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
 * Walk out, right now (docs/ui-flows.md §4). `walkerId` lets staff log it
 * for whoever's actually taking the dog — the real primary case, per
 * Paul (2026-09-07): one staff member on a shared kiosk iPad checks people
 * in/out; ordinary volunteers essentially never sign into the app
 * themselves. Defaults to the signed-in person (the fast "it's me" path,
 * for the minority who do self-serve). RLS (`da_insert`) is what actually
 * enforces "a non-staff volunteer can only log a walk for themselves" —
 * this just supplies the values; a rejected insert surfaces as a normal
 * Postgres error.
 */
export async function startWalk(dogId: string, walkerId?: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("dog_activity").insert({
    dog_id: dogId,
    type: "walk",
    person_id: person.canKiosk && walkerId ? walkerId : person.id,
    started_at: new Date().toISOString(),
  });

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${dogId}`);
  return {};
}

/**
 * The one-tap fast path (docs/ui-flows.md §5): closes whichever activity is
 * currently open for the dog, right now. RLS (`da_update`) only allows this
 * for staff or the person the open activity belongs to. If the real return
 * time wasn't "now", the fix is the existing "Edit times" link on the dog's
 * Activity summary (two taps: dog -> Edit times) rather than a confirm step
 * on every single close — Paul (2026-09-08): fewest clicks for the standard
 * case, where the time usually IS right.
 */
export async function bringDogIn(dogId: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dog_activity")
    .update({ ended_at: new Date().toISOString() })
    .eq("dog_id", dogId)
    .is("ended_at", null)
    .select("id");

  if (error) return { error: friendlyError(error) };
  if (!data || data.length === 0) return { error: "Nothing to bring in — no open activity for this dog." };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${dogId}`);
  return {};
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

/**
 * The "available walkers" list — active volunteers who said they want to
 * do dog walking (docs/ui-flows.md §7). Used by the Start Walk kiosk
 * picker and Manual entry. Someone who registered only for, say,
 * fundraising is an active volunteer but not a walker, so they're left
 * out. Volunteers with no interests recorded (older / migrated records)
 * are kept in — better to over-include than hide a real walker.
 */
export async function listActiveVolunteers(): Promise<{ id: string; name: string }[]> {
  const person = await getCurrentPerson();
  if (!person || !person.canKiosk) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_roles")
    .select(
      "person:people!person_roles_person_id_fkey(id, first_name, surname, volunteer_profile(interests))",
    )
    .eq("role", "volunteer")
    .eq("status", "active");
  if (error) console.error("listActiveVolunteers failed", error);

  return ((data ?? []) as unknown as Array<{
    person: {
      id: string;
      first_name: string;
      surname: string;
      volunteer_profile: { interests: string[] | null } | null;
    };
  }>)
    .filter((r) => {
      const interests = r.person.volunteer_profile?.interests ?? [];
      return interests.length === 0 || interests.includes("dog_walking");
    })
    .map((r) => ({ id: r.person.id, name: `${r.person.first_name} ${r.person.surname}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active carers of the given type, for the Start Jail Break/Foster form (staff only). */
export async function listActiveCarers(type: "jail_break" | "foster"): Promise<{ id: string; name: string }[]> {
  const person = await getCurrentPerson();
  if (!person || !person.isStaff) return [];

  const role = type === "jail_break" ? "jailbreak_carer" : "foster_carer";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_roles")
    .select("person:people!person_roles_person_id_fkey(id, first_name, surname)")
    .eq("role", role)
    .eq("status", "active");
  if (error) console.error("listActiveCarers failed", error);

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
  // Yard is a kiosk operation (staff or Volunteer Plus); bed rest / jail
  // break / foster stay staff-only. RLS enforces the same.
  if (input.type === "yard" ? !person.canKiosk : !person.isStaff)
    return { error: "You can't start this." };

  if ((input.type === "jail_break" || input.type === "foster") && !input.personId) {
    return { error: "Pick a carer." };
  }
  // Every type here gets a due-back (Yard included, so a caretaker can be
  // alerted when a dog is overdue to come in).
  if (!input.dueBack) {
    return { error: "Due back is required." };
  }
  if (input.type === "bed_rest" && !input.reason?.trim()) {
    return { error: "Notes are required for bed rest." };
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
 * Manual entry (docs/ui-flows.md §6) — the old app's own name for logging
 * something that already happened (`Is_Manual_Entry` on the Walks table).
 * Since 2026-10-04 it covers every activity type, not just walks (Paul):
 * the person picks the type, and who may log which mirrors RLS — a plain
 * volunteer only a walk for themselves, a kiosk operator also yard, staff
 * everything. Always recorded as `entered_late` since by definition it's
 * added after the fact. Jail break / foster need an active carer of that
 * type; yard and bed rest have no person. For bed rest the Notes text is
 * stored in `reason`, same as Start Bed Rest.
 */
export async function logManualActivity(input: {
  dogId: string;
  type: "walk" | "yard" | "bed_rest" | "jail_break" | "foster";
  personId?: string;
  checkOut: string;
  checkIn: string;
  notes: string;
  /** Which yard, for type "yard". */
  yard?: string;
}): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const { type } = input;
  const needsPerson = type === "walk" || type === "jail_break" || type === "foster";
  if (needsPerson && !input.personId) return { error: type === "walk" ? "Pick who walked the dog." : "Pick a carer." };
  if (type === "walk" && !person.canKiosk && input.personId !== person.id) {
    return { error: "You can only log a walk for yourself." };
  }
  if (type === "yard" && !person.canKiosk) return { error: "You can't log this." };
  if ((type === "bed_rest" || type === "jail_break" || type === "foster") && !person.isStaff) {
    return { error: "You can't log this." };
  }
  if (type === "bed_rest" && !input.notes.trim()) return { error: "Notes are required for bed rest." };

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
    type,
    person_id: needsPerson ? input.personId : null,
    placed_by: type === "walk" ? null : person.id,
    started_at: checkOut.toISOString(),
    ended_at: checkIn.toISOString(),
    entered_late: true,
    reason: type === "yard" ? input.yard?.trim() || null : type === "bed_rest" ? input.notes.trim() : null,
    notes: type === "bed_rest" ? null : input.notes.trim() || null,
  });

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${input.dogId}`);
  return {};
}
