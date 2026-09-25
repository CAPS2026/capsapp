"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { markLeaveNoticesForShift } from "@/lib/leave-data";
import {
  getActiveShiftPerson,
  setActiveShiftPerson,
  clearActiveShiftPerson,
} from "@/lib/shift-identity";
import {
  ensureRosterSession,
  getDogNameSuggestions,
  getOpenShift,
  getRosterablePeople,
  getShiftSettings,
  resolvePart,
  touchShiftActivity,
} from "@/lib/shift-data";
import {
  getShiftEmailPreview,
  maybeSendShiftEmail,
  sendHealthConcernEmail,
  type EmailPreview,
} from "@/lib/shift-email";
import { distanceMetres, minutesLate, sessionInstant, shelterToday, shiftDay, type Part } from "@/lib/shift";

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
 *  client for this; it always comes from the server-read cookie. Every
 *  call also counts as activity on their open shift, so a genuinely busy
 *  shift never looks abandoned to the auto-close check.
 *
 *  `hasOpenShift` comes free from that same activity-touch query (it only
 *  matches a row when one exists with signed_out_at still null), worth
 *  keeping distinct from "identified on this device", see requireOnShift. */
async function requireActingPerson() {
  // Independent lookups, so run them together rather than one after the
  // other (each is a network round trip, and this runs on every tick).
  const [device, me] = await Promise.all([requireDeviceStaff(), getActiveShiftPerson()]);
  if (!device || !me) return null;

  const [late, settings] = await Promise.all([touchShiftActivity(me.id), getShiftSettings()]);
  // Signed in more than the grace period late, and hasn't said why yet:
  // the reason is required, so checklist actions refuse until it's given
  // (the screen also covers everything with a prompt for it).
  const lateBlocked =
    late !== null && late.lateMinutes !== null && late.lateMinutes > settings.lateAfterMinutes && !late.lateReason;
  return { ...me, lateBlocked, hasOpenShift: late !== null };
}

const NO_OPEN_SHIFT = "You don't have an open shift. Tap your name to sign in again.";

/** Same as requireActingPerson, but for anything that only makes sense
 *  during an actual shift (ticking, claiming, notes, extras): being
 *  "identified" on this device (the cookie) is not the same as having a
 *  shift actually open. Without this, a page left open from an earlier
 *  session, or one from before someone's shift was cleared or ended,
 *  could still tick tasks under their name with no shift running behind
 *  it: no timer, not shown as on shift, and the tick never touches the
 *  auto-close activity clock. Every checklist action below requires this,
 *  not just requireActingPerson. */
async function requireOnShift() {
  const me = await requireActingPerson();
  if (!me || !me.hasOpenShift) return null;
  return me;
}

const LATE_REASON_REQUIRED = "Please give your reason for being late first.";

/** How long after a session's end (plus any overtime logged) tapping your
 *  name reopens a shift that was closed automatically, rather than
 *  starting a new one: the auto-close wait plus this much. It has to be
 *  longer than the auto-close wait, or the shift would never still be
 *  reopenable by the time it had been closed. */
const REOPEN_MINUTES_AFTER_AUTOCLOSE = 180;

function bust() {
  revalidatePath("/shift");
}

// ---------------------------------------------------------------------------
// Who's on / sign in / sign out
// ---------------------------------------------------------------------------

/** Tap a name on the picker. If that person already has an open shift
 *  today (they stepped away and are coming back), just resume it, no
 *  new sign-in, no duplicate row (shift_log's unique index would refuse
 *  it anyway). If their shift for this session was closed automatically a
 *  little while ago, reopen it rather than starting a second one. Otherwise
 *  this is a fresh sign-in: capture the time, location (if given) and
 *  lateness against today's rostered start. */
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

  const [session, settings] = await Promise.all([ensureRosterSession(date, part), getShiftSettings()]);

  // If this person's shift for this same session was closed AUTOMATICALLY
  // earlier (they were still working but hadn't ticked anything for a
  // while), tapping their name again reopens that shift instead of starting
  // a second one. A second one would show them hours "late" and would then
  // be closed as zero length. Only within a few hours of the session's end:
  // after that, tapping a name is a genuinely new sign-in.
  const { data: autoClosed } = await supabase
    .from("shift_log")
    .select("id, extended_minutes")
    .eq("person_id", personId)
    .eq("date", date)
    .eq("part", part)
    .eq("auto_closed", true)
    .order("signed_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (autoClosed) {
    const endAt = sessionInstant(date, session.ends).getTime() + (autoClosed.extended_minutes ?? 0) * 60000;
    const windowMin = settings.autocloseGraceMinutes + REOPEN_MINUTES_AFTER_AUTOCLOSE;
    if (now.getTime() <= endAt + windowMin * 60000) {
      const { error: reopenErr } = await supabase
        .from("shift_log")
        .update({
          signed_out_at: null,
          auto_closed: false,
          reopened_at: now.toISOString(),
          last_activity_at: now.toISOString(),
        })
        .eq("id", autoClosed.id);
      if (reopenErr) return { error: reopenErr.message };
      await setActiveShiftPerson(personId);
      bust();
      return {};
    }
  }

  // Lateness only means something for someone actually rostered on this
  // session. Covering for a colleague, or helping out unrostered, is never
  // "late": their start is simply when they signed in.
  const { data: assignment } = await supabase
    .from("roster_assignment")
    .select("id")
    .eq("session_id", session.id)
    .eq("person_id", personId)
    .maybeSingle();
  const late = assignment ? minutesLate(now, session.starts) : 0;
  const lateMinutes = late > 0 ? late : null;

  let distanceM: number | null = null;
  if (lat != null && lng != null && settings.shelterLat != null && settings.shelterLng != null) {
    distanceM = Math.round(distanceMetres(lat, lng, settings.shelterLat, settings.shelterLng));
  }

  const { error } = await supabase.from("shift_log").insert({
    person_id: personId,
    roster_session_id: session.id,
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

  // A fresh sign-in: any leave decision they haven't been shown yet gets
  // tied to this shift, so the sidebar shows it once (this shift only).
  if (!error) {
    const opened = await getOpenShift(personId);
    if (opened) await markLeaveNoticesForShift(personId, opened.id);
  }

  await setActiveShiftPerson(personId);
  bust();
  return {};
}

/** What the end-of-shift email would say for the caller's current shift,
 *  built by the same code that builds the real one. Sends nothing. */
export async function previewShiftEmail(): Promise<{ error: string } | { error?: undefined; preview: EmailPreview }> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const open = await getOpenShift(me.id);
  if (!open) return { error: "You don't have an open shift." };
  return { preview: await getShiftEmailPreview(open.date, open.part) };
}

/** Hand the tablet to someone else without ending the active person's
 *  shift, they can pick their own name and come back to this one later. */
export async function switchPerson(): Promise<void> {
  await clearActiveShiftPerson();
  bust();
}

/** The reason for a late sign-in. Required, so it can't be blank. */
export async function setLateReason(reason: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const clean = reason.trim();
  if (!clean) return { error: "Please give a reason for being late." };
  const supabase = await createClient();
  const open = await getOpenShift(me.id);
  if (!open) return { error: "No open shift to add a reason to." };
  const { error } = await supabase.from("shift_log").update({ late_reason: clean }).eq("id", open.id);
  if (error) return { error: error.message };
  bust();
  return {};
}

/** Ending a shift more than the grace period before its rostered end (plus
 *  any overtime logged) needs a reason, which goes in the shift email. */
export async function endShift(earlyReason?: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const supabase = await createClient();
  const open = await getOpenShift(me.id);
  if (!open) return { error: "You don't have an open shift." };

  const [session, settings] = await Promise.all([ensureRosterSession(open.date, open.part), getShiftSettings()]);
  const endsAt = sessionInstant(open.date, session.ends).getTime() + (open.extendedMinutes ?? 0) * 60000;
  const now = new Date();
  const earlyMin = Math.round((endsAt - now.getTime()) / 60000);
  const early = earlyMin > settings.lateAfterMinutes;
  const reason = (earlyReason ?? "").trim();
  if (early && !reason) return { error: "Please give a reason for finishing early." };

  const { error } = await supabase
    .from("shift_log")
    .update({ signed_out_at: now.toISOString(), ended_early_reason: early ? reason : null })
    .eq("id", open.id);
  if (error) return { error: error.message };
  await clearActiveShiftPerson();
  // No-op unless this was the last open shift on the session, see
  // maybeSendShiftEmail. Best-effort: a failed send here shouldn't stop
  // someone from actually ending their shift.
  await maybeSendShiftEmail(open.date, open.part).catch((e) => console.error("endShift: email failed", e));
  bust();
  return {};
}

/** Logs overtime: how many minutes past the rostered end they worked, and
 *  why. Replaces any earlier extension on the same shift. The shift then
 *  isn't auto-closed until that extra time has passed too. */
export async function extendShift(minutes: number, reason: string): Promise<Result> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const mins = Math.round(minutes);
  if (!Number.isFinite(mins) || mins < 1 || mins > 600) return { error: "Enter how many minutes you stayed on." };
  const clean = reason.trim();
  if (!clean) return { error: "Please say why you needed to stay longer." };
  const open = await getOpenShift(me.id);
  if (!open) return { error: "You don't have an open shift." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_log")
    .update({ extended_minutes: mins, extended_reason: clean })
    .eq("id", open.id);
  if (error) return { error: error.message };
  bust();
  return {};
}

/** A dog health concern. Saved first (so it is never lost), then emailed
 *  straight away to whoever is set up to receive them. `emailed` says
 *  whether that email actually went, so the screen never claims Shayna was
 *  told when she wasn't. Not blocked by the late-reason prompt: this must
 *  always be possible. */
export async function flagHealthConcern(input: {
  body: string;
  dogName: string;
  urgent: boolean;
}): Promise<{ error?: string; emailed?: boolean }> {
  const me = await requireActingPerson();
  if (!me) return { error: "Pick who you are first." };
  const body = input.body.trim();
  if (!body) return { error: "Describe the concern first." };
  const dogName = input.dogName.trim();
  if (!dogName) return { error: "Enter the dog's name." };
  const open = await getOpenShift(me.id);
  const part = open?.part ?? resolvePart(null);
  const date = open?.date ?? shelterToday();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_concern")
    .insert({
      person_id: me.id,
      shift_log_id: open?.id ?? null,
      date,
      part,
      dog_name: dogName,
      urgent: input.urgent,
      body,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save the concern." };

  const emailed = await sendHealthConcernEmail({
    concernId: data.id,
    personName: me.name,
    part,
    date,
    dogName,
    urgent: input.urgent,
    body,
  }).catch((e) => {
    console.error("flagHealthConcern: email failed", e);
    return false;
  });
  return { emailed };
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function signOffTask(instanceId: string, note: string): Promise<Result> {
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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
  const me = await requireOnShift();
  if (!me) return { error: NO_OPEN_SHIFT };
  if (me.lateBlocked) return { error: LATE_REASON_REQUIRED };
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

// ---------------------------------------------------------------------------
// Roster editing (admin only)
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const me = await getCurrentPerson();
  return me?.isAdmin ? me : null;
}

/** Replaces the roster for a run of dates. Up to two people per session,
 *  covers the common case (one caretaker) and the frequent one (two on
 *  at once when all three are around and nobody's on leave). Each
 *  date/part gets its own roster_session (created via ensureRosterSession
 *  if it doesn't exist yet) and its existing assignments are replaced
 *  outright rather than merged, so re-saving a corrected row doesn't
 *  leave a stale name sitting alongside the new ones. */
export async function saveRosterEntries(
  entries: { date: string; morningPersonIds: string[]; afternoonPersonIds: string[] }[],
): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  // Past days are a record of who was rostered, which lateness and "covering"
  // in the shift emails were judged against. They can't be changed after
  // the fact; today and later can.
  const today = shelterToday();
  if (entries.some((e) => e.date < today)) return { error: "Past days can't be changed. Only today and later can." };
  const supabase = await createClient();

  for (const row of entries) {
    for (const part of ["morning", "afternoon"] as Part[]) {
      const personIds = (part === "morning" ? row.morningPersonIds : row.afternoonPersonIds).filter(Boolean);
      const session = await ensureRosterSession(row.date, part);

      const { error: delErr } = await supabase.from("roster_assignment").delete().eq("session_id", session.id);
      if (delErr) return { error: delErr.message };

      if (personIds.length) {
        const { error: insErr } = await supabase
          .from("roster_assignment")
          .insert(personIds.map((personId) => ({ session_id: session.id, person_id: personId })));
        if (insErr) return { error: insErr.message };
      }
    }
  }

  revalidatePath("/shift/roster");
  return {};
}

// ---------------------------------------------------------------------------
// Forgot to sign in
// ---------------------------------------------------------------------------

/** How many days back a forgotten shift can be entered (today counts as 0). */
const FORGOTTEN_SHIFT_DAYS_BACK = 2;

/** Someone worked a shift but didn't use the app at the time (forgot, or a
 *  stand-in did it for them). Records it afterwards with the times they
 *  give, marked "entered afterwards" with the reason, so their hours are on
 *  record and the shift email for that session goes out (or an UPDATED one,
 *  if it already went). Only for a session that has already finished. */
export async function recordForgottenShift(input: {
  personId: string;
  date: string;
  part: Part;
  starts: string;
  ends: string;
  reason: string;
}): Promise<Result> {
  if (!(await requireDeviceStaff())) return { error: "Staff only." };

  const people = await getRosterablePeople();
  const person = people.find((p) => p.id === input.personId);
  if (!person) return { error: "Choose who worked the shift." };

  const today = shelterToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Choose the day." };
  if (input.date > today || input.date < shiftDay(today, -FORGOTTEN_SHIFT_DAYS_BACK)) {
    return { error: `Only today or the last ${FORGOTTEN_SHIFT_DAYS_BACK} days can be entered.` };
  }
  if (input.part !== "morning" && input.part !== "afternoon") return { error: "Choose morning or afternoon." };
  const timeOk = (t: string) => /^\d{2}:\d{2}$/.test(t);
  if (!timeOk(input.starts) || !timeOk(input.ends)) return { error: "Enter the start and finish times." };
  const reason = input.reason.trim();
  if (!reason) return { error: "Please say why the app wasn't used at the time." };

  const startAt = sessionInstant(input.date, input.starts);
  const endAt = sessionInstant(input.date, input.ends);
  const now = new Date();
  if (endAt.getTime() <= startAt.getTime()) return { error: "The finish time must be after the start time." };
  if (endAt.getTime() > now.getTime()) return { error: "The finish time can't be in the future. Sign in normally instead." };
  if (endAt.getTime() - startAt.getTime() > 12 * 60 * 60000) return { error: "That's longer than 12 hours. Check the times." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shift_log")
    .select("id")
    .eq("person_id", person.id)
    .eq("date", input.date)
    .eq("part", input.part)
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: `${person.name} already has a ${input.part} shift recorded for that day.` };
  }

  const session = await ensureRosterSession(input.date, input.part);
  const { data: assignment } = await supabase
    .from("roster_assignment")
    .select("id")
    .eq("session_id", session.id)
    .eq("person_id", person.id)
    .maybeSingle();
  const late = assignment ? minutesLate(startAt, session.starts) : 0;

  const { error } = await supabase.from("shift_log").insert({
    person_id: person.id,
    roster_session_id: session.id,
    date: input.date,
    part: input.part,
    signed_in_at: startAt.toISOString(),
    signed_out_at: endAt.toISOString(),
    last_activity_at: endAt.toISOString(),
    late_minutes: late > 0 ? late : null,
    entered_afterwards_reason: reason,
  });
  if (error) return { error: error.message };

  await maybeSendShiftEmail(input.date, input.part).catch((e) => console.error("recordForgottenShift: email failed", e));
  bust();
  return {};
}

// ---------------------------------------------------------------------------
// Health concerns: dealt with (admin), dog name suggestions
// ---------------------------------------------------------------------------

/** An admin marks a health concern as dealt with, with an optional note of
 *  what was done. */
export async function resolveHealthConcern(id: string, note: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_concern")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by_name: `${me.firstName} ${me.surname}`.trim() || null,
      resolved_note: note.trim() || null,
    })
    .eq("id", id)
    .is("resolved_at", null)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "That concern has already been marked as dealt with." };
  revalidatePath("/shift/handover");
  return {};
}

/** Dog names typed before, for the health concern pop-up's suggestions. */
export async function dogNameSuggestions(): Promise<string[]> {
  if (!(await requireDeviceStaff())) return [];
  return getDogNameSuggestions();
}
