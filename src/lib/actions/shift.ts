"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import {
  getActiveShiftPerson,
  setActiveShiftPerson,
  clearActiveShiftPerson,
} from "@/lib/shift-identity";
import { getOpenShift, getShiftSettings, lateMinutesFor, resolvePart } from "@/lib/shift-data";
import { distanceMetres, shelterToday, type Part } from "@/lib/shift";

type Result = { error: string } | { error?: undefined };

/** Gates that this device is allowed to use the staff app at all: the
 *  tablet's real Supabase Auth session, same check every other staff
 *  screen in this codebase uses. Doesn't say WHO is acting; see
 *  requireActingPerson for that. */
async function requireDeviceStaff() {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return null;
  return me;
}

/** The person currently "picked" on the who's-on screen, the id every
 *  action below attributes to. Never trust a personId passed in from the
 *  client for this; it always comes from the server-read cookie. */
async function requireActingPerson() {
  if (!(await requireDeviceStaff())) return null;
  return getActiveShiftPerson();
}

function bust() {
  revalidatePath("/shift");
}

// ---------------------------------------------------------------------------
// Who's on / sign in / sign out
// ---------------------------------------------------------------------------

/** Tap a name on the picker. If that person already has an open shift
 *  today (they stepped away and are coming back), just resume it, no
 *  new sign-in, no duplicate row (shift_log's unique index would refuse
 *  it anyway). Otherwise this is a fresh sign-in: capture the time,
 *  location (if given) and lateness against today's rostered start. */
export async function pickPerson(
  personId: string,
  rosteredPart: Part | null,
  lat: number | null,
  lng: number | null,
): Promise<Result> {
  if (!(await requireDeviceStaff())) return { error: "Staff only." };

  const supabase = await createClient();
  const { data: person } = await supabase.from("people").select("id").eq("id", personId).maybeSingle();
  if (!person) return { error: "That person wasn't found." };

  const existing = await getOpenShift(personId);
  if (existing) {
    await setActiveShiftPerson(personId);
    bust();
    return {};
  }

  const date = shelterToday();
  const part = resolvePart(rosteredPart);
  const now = new Date();

  const [lateMinutes, settings] = await Promise.all([
    lateMinutesFor(date, part, now),
    getShiftSettings(),
  ]);

  let distanceM: number | null = null;
  if (lat != null && lng != null && settings.shelterLat != null && settings.shelterLng != null) {
    distanceM = Math.round(distanceMetres(lat, lng, settings.shelterLat, settings.shelterLng));
  }

  const { data: session } = await supabase
    .from("roster_session")
    .select("id")
    .eq("date", date)
    .eq("part", part)
    .maybeSingle();

  const { error } = await supabase.from("shift_log").insert({
    person_id: personId,
    roster_session_id: session?.id ?? null,
    date,
    part,
    signed_in_at: now.toISOString(),
    signed_in_lat: lat,
    signed_in_lng: lng,
    signed_in_distance_m: distanceM,
    late_minutes: lateMinutes,
  });
  // 23505 = they already have an open shift (a near-simultaneous double
  // tap), fine, just proceed as a resume.
  if (error && error.code !== "23505") return { error: error.message };

  await setActiveShiftPerson(personId);
  bust();
  return {};
}

/** Hand the tablet to someone else without ending the active person's
 *  shift, they can pick their own name and come back to this one later. */
export async function switchPerson(): Promise<void> {
  await clearActiveShiftPerson();
  bust();
}

/** Add or update the optional reason for a late sign-in. */
export async function setLateReason(reason: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const open = await getOpenShift(me.id);
  if (!open) return { error: "No open shift to add a reason to." };
  const { error } = await supabase
    .from("shift_log")
    .update({ late_reason: reason.trim() || null })
    .eq("id", open.id);
  if (error) return { error: error.message };
  bust();
  return {};
}

export async function endShift(): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const open = await getOpenShift(me.id);
  if (!open) return { error: "You don't have an open shift." };
  const { error } = await supabase
    .from("shift_log")
    .update({ signed_out_at: new Date().toISOString() })
    .eq("id", open.id);
  if (error) return { error: error.message };
  await clearActiveShiftPerson();
  bust();
  return {};
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function signOffTask(instanceId: string, note: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({
      status: "done",
      note: note.trim() || null,
      actioned_by: me.id,
      actioned_at: new Date().toISOString(),
    })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  bust();
  return {};
}

export async function markTaskNotRequired(instanceId: string, note: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  if (!note.trim()) return { error: "Add a short note saying why it wasn't needed." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({
      status: "not_required",
      note: note.trim(),
      actioned_by: me.id,
      actioned_at: new Date().toISOString(),
    })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  bust();
  return {};
}

export async function reopenTask(instanceId: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({ status: "open", actioned_by: null, actioned_at: null })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  bust();
  return {};
}

export async function updateTaskNote(instanceId: string, note: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({ note: note.trim() || null })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  return {};
}

/** Soft "this one's mine," not a lock. Claiming again (by anyone)
 *  overwrites who it's claimed by. */
export async function claimTask(instanceId: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({ claimed_by: me.id, claimed_at: new Date().toISOString() })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  bust();
  return {};
}

export async function unclaimTask(instanceId: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({ claimed_by: null, claimed_at: null })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  bust();
  return {};
}

/** A caretaker logging something off the standard checklist. Unlike the
 *  old dog-app "ad-hoc task" (admin only), any signed-in caretaker can
 *  add one of these, `is_extra` keeps it visually and structurally
 *  separate from the standard categorised list. */
export async function addExtraTask(title: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  if (!title.trim()) return { error: "Say what you did." };
  const supabase = await createClient();
  const date = shelterToday();
  const open = await getOpenShift(me.id);
  const part = open?.part ?? resolvePart(null);
  const { error } = await supabase.from("task_instance").insert({
    date,
    part,
    category: null,
    title: title.trim(),
    is_extra: true,
    sort_order: 100,
  });
  if (error) return { error: error.message };
  bust();
  return {};
}

// ---------------------------------------------------------------------------
// Handover
// ---------------------------------------------------------------------------

export async function addHandoverNote(body: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  if (!body.trim()) return { error: "Write something first." };
  const supabase = await createClient();
  const date = shelterToday();
  const open = await getOpenShift(me.id);
  const part = open?.part ?? resolvePart(null);
  const { error } = await supabase.from("handover_note").insert({
    person_id: me.id,
    shift_log_id: open?.id ?? null,
    date,
    part,
    body: body.trim(),
  });
  if (error) return { error: error.message };
  revalidatePath("/shift/handover");
  return {};
}
