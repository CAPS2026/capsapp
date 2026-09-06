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

/**
 * The one-tap fast path (docs/ui-flows.md §5): closes whichever activity is
 * currently open for the dog. RLS (`da_update`) only allows this for staff or
 * the person the open activity belongs to.
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
 * Bring in, but at a time other than now — the dog actually came back
 * earlier and nobody tapped End Walk/End Homecare at the time
 * (docs/ui-flows.md §5 full path, step 2: "Came back earlier"). Unlike the
 * one-tap fast path, this always flags the row `edited` since a non-now
 * time is exactly what that flag is for.
 */
export async function bringDogInAt(dogId: string, endedAtInput: string, notes: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const endedAt = new Date(endedAtInput);
  const now = new Date();
  if (Number.isNaN(endedAt.getTime())) return { error: "Enter a return time." };
  if (endedAt > now) return { error: "Return time can't be in the future." };

  const supabase = await createClient();
  const { data: open } = await supabase
    .from("dog_activity")
    .select("id, started_at")
    .eq("dog_id", dogId)
    .is("ended_at", null)
    .maybeSingle();

  if (!open) return { error: "Nothing to bring in — no open activity for this dog." };
  if (endedAt < new Date(open.started_at)) return { error: "Return time can't be before it went out." };

  const { error } = await supabase
    .from("dog_activity")
    .update({
      ended_at: endedAt.toISOString(),
      notes: notes.trim() || null,
      edited_at: now.toISOString(),
      edited_by: person.id,
    })
    .eq("id", open.id);

  if (error) return { error: friendlyError(error) };

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
