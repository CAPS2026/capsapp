import { createClient } from "@/lib/supabase/server";
import {
  distanceMetres,
  initials,
  minutesLate,
  partForTime,
  shelterToday,
  CATEGORY_ORDER,
  type OpenShift,
  type Part,
  type ShiftPerson,
  type ShiftTaskRow,
  type TaskCategory,
  type TaskStatus,
} from "@/lib/shift";

/** People who can appear on the shift picker: active staff/committee/admin. */
export async function getRosterablePeople(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_roles")
    .select("person:people!person_roles_person_id_fkey(id, first_name, surname)")
    .in("role", ["staff", "committee", "admin"])
    .eq("status", "active");
  if (error) console.error("getRosterablePeople failed", error);

  const seen = new Set<string>();
  const out: { id: string; name: string }[] = [];
  for (const r of (data ?? []) as unknown as Array<{
    person: { id: string; first_name: string; surname: string } | null;
  }>) {
    if (!r.person || seen.has(r.person.id)) continue;
    seen.add(r.person.id);
    out.push({ id: r.person.id, name: `${r.person.first_name} ${r.person.surname}`.trim() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Everyone who could sign in today, each annotated with their rostered
 *  part for `date` (or null if not rostered at all). Rostered people
 *  first, then everyone else, the picker shows both, dimming the rest. */
export async function getTodayShiftPeople(date: string): Promise<ShiftPerson[]> {
  const supabase = await createClient();
  const people = await getRosterablePeople();

  const { data: sessions, error } = await supabase
    .from("roster_session")
    .select("part, roster_assignment(person_id)")
    .eq("date", date);
  if (error) console.error("getTodayShiftPeople: roster read failed", error);

  const partByPerson = new Map<string, Part>();
  for (const s of (sessions ?? []) as unknown as Array<{
    part: Part;
    roster_assignment: { person_id: string }[] | null;
  }>) {
    for (const a of s.roster_assignment ?? []) {
      // If someone's rostered for both parts, keep the first we see,
      // good enough for "which session is this sign-in against".
      if (!partByPerson.has(a.person_id)) partByPerson.set(a.person_id, s.part);
    }
  }

  return people
    .map((p) => ({ id: p.id, name: p.name, part: partByPerson.get(p.id) ?? null }))
    .sort((a, b) => {
      if (!!a.part !== !!b.part) return a.part ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

type GeofenceSettings = {
  shelterLat: number | null;
  shelterLng: number | null;
  radiusM: number;
  lateAfterMinutes: number;
  autocloseGraceMinutes: number;
};

export async function getShiftSettings(): Promise<GeofenceSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_settings")
    .select(
      "shelter_lat, shelter_lng, shift_geofence_radius_m, staff_late_after_minutes, staff_autoclose_grace_minutes",
    )
    .maybeSingle();
  return {
    shelterLat: data?.shelter_lat ?? null,
    shelterLng: data?.shelter_lng ?? null,
    radiusM: data?.shift_geofence_radius_m ?? 150,
    lateAfterMinutes: data?.staff_late_after_minutes ?? 10,
    autocloseGraceMinutes: data?.staff_autoclose_grace_minutes ?? 60,
  };
}

export type RosterSessionRow = {
  id: string;
  starts: string; // "HH:MM"
  ends: string;
  emailSentAt: string | null;
};

const DEFAULT_TIMES: Record<Part, { starts: string; ends: string }> = {
  morning: { starts: "06:30", ends: "09:30" },
  afternoon: { starts: "15:30", ends: "17:30" },
};

/** The roster session for (date, part), creating it from the org's
 *  default times if it doesn't exist yet, so there's always a stable
 *  row to read start/end times from and to mark the summary email sent
 *  against, even for a day nobody's got around to rostering. Mirrors the
 *  old Staff tab's `ensureSession` (src/lib/actions/staff.ts). */
export async function ensureRosterSession(date: string, part: Part): Promise<RosterSessionRow> {
  const supabase = await createClient();

  const { data: found } = await supabase
    .from("roster_session")
    .select("id, starts, ends, email_sent_at")
    .eq("date", date)
    .eq("part", part)
    .maybeSingle();
  if (found) {
    return {
      id: found.id,
      starts: String(found.starts).slice(0, 5),
      ends: String(found.ends).slice(0, 5),
      emailSentAt: found.email_sent_at,
    };
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("roster_morning_start, roster_morning_end, roster_afternoon_start, roster_afternoon_end")
    .maybeSingle();
  const starts =
    part === "morning"
      ? (settings?.roster_morning_start?.slice(0, 5) ?? DEFAULT_TIMES.morning.starts)
      : (settings?.roster_afternoon_start?.slice(0, 5) ?? DEFAULT_TIMES.afternoon.starts);
  const ends =
    part === "morning"
      ? (settings?.roster_morning_end?.slice(0, 5) ?? DEFAULT_TIMES.morning.ends)
      : (settings?.roster_afternoon_end?.slice(0, 5) ?? DEFAULT_TIMES.afternoon.ends);

  const { data: created, error } = await supabase
    .from("roster_session")
    .insert({ date, part, starts, ends })
    .select("id, starts, ends, email_sent_at")
    .single();
  if (error) {
    // Someone else created it in the gap, read it back.
    const { data: retry } = await supabase
      .from("roster_session")
      .select("id, starts, ends, email_sent_at")
      .eq("date", date)
      .eq("part", part)
      .single();
    return {
      id: retry!.id,
      starts: String(retry!.starts).slice(0, 5),
      ends: String(retry!.ends).slice(0, 5),
      emailSentAt: retry!.email_sent_at,
    };
  }
  return { id: created.id, starts, ends, emailSentAt: null };
}

/** The person's currently open (not signed out) shift, if any, today. */
export async function getOpenShift(personId: string): Promise<OpenShift | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_log")
    .select("id, person_id, date, part, signed_in_at, late_minutes, late_reason, roster_session_id")
    .eq("person_id", personId)
    .is("signed_out_at", null)
    .maybeSingle();
  if (error) console.error("getOpenShift failed", error);
  if (!data) return null;
  return {
    id: data.id,
    personId: data.person_id,
    date: data.date,
    part: data.part,
    startedAt: data.signed_in_at,
    lateMinutes: data.late_minutes,
    lateReason: data.late_reason,
    rostered: data.roster_session_id !== null,
  };
}

/** Bumps the person's open shift's activity clock, called on every
 *  checklist action so a busy shift never looks abandoned. No-op if
 *  they don't have an open shift (shouldn't normally happen). */
export async function touchShiftActivity(personId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("shift_log")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("person_id", personId)
    .is("signed_out_at", null);
}

/** Closes any shift that's both past its rostered end time and silent
 *  (no activity) for org_settings.staff_autoclose_grace_minutes: an
 *  abandoned shift, not a busy one running long. Call opportunistically
 *  wherever the app loads; there's no scheduled job behind this yet, so
 *  a shift only actually closes the next time someone opens the app
 *  after it's gone stale. Returns the (date, part) pairs it closed, so
 *  the caller can check whether that completes a session's email. */
export async function autocloseStaleShifts(): Promise<Array<{ date: string; part: Part }>> {
  const supabase = await createClient();
  const { autocloseGraceMinutes } = await getShiftSettings();

  const { data: open, error } = await supabase
    .from("shift_log")
    .select("id, date, part, last_activity_at")
    .is("signed_out_at", null);
  if (error) {
    console.error("autocloseStaleShifts: read failed", error);
    return [];
  }
  if (!open || open.length === 0) return [];

  const now = new Date();
  const closed: Array<{ date: string; part: Part }> = [];

  for (const s of open as Array<{ id: string; date: string; part: Part; last_activity_at: string }>) {
    const session = await ensureRosterSession(s.date, s.part);
    const pastEnd = minutesLate(now, session.ends) > 0;
    if (!pastEnd) continue;

    const idleMinutes = (now.getTime() - new Date(s.last_activity_at).getTime()) / 60000;
    if (idleMinutes < autocloseGraceMinutes) continue;

    const { error: closeErr } = await supabase
      .from("shift_log")
      .update({ signed_out_at: now.toISOString(), auto_closed: true })
      .eq("id", s.id);
    if (closeErr) console.error("autocloseStaleShifts: close failed", closeErr);
    else closed.push({ date: s.date, part: s.part });
  }
  return closed;
}

/** Distance from the shelter, in metres. Null if either point is missing. */
export async function distanceFromShelter(lat: number | null, lng: number | null): Promise<number | null> {
  if (lat == null || lng == null) return null;
  const { shelterLat, shelterLng } = await getShiftSettings();
  if (shelterLat == null || shelterLng == null) return null;
  return Math.round(distanceMetres(lat, lng, shelterLat, shelterLng));
}

/** How late (minutes, null if not late) a sign-in at `at` is against
 *  `date`/`part`'s rostered start (creating that session from the org's
 *  defaults first, if it doesn't exist yet). */
export async function lateMinutesFor(date: string, part: Part, at: Date): Promise<number | null> {
  const session = await ensureRosterSession(date, part);
  const late = minutesLate(at, session.starts);
  return late > 0 ? late : null;
}

/** Which part to sign someone into: their roster slot today if they have
 *  one, otherwise a guess from the time of day. */
export function resolvePart(rostered: Part | null): Part {
  return rostered ?? partForTime();
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

type TemplateForGen = {
  id: string;
  title: string;
  part: Part;
  category: TaskCategory | null;
  repeat: "daily" | "weekly" | "monthly";
  weekdays: number[] | null;
  day_of_month: number | null;
  sort_order: number;
};

function templateMatchesDate(t: TemplateForGen, date: Date): boolean {
  if (t.repeat === "daily") return true;
  if (t.repeat === "weekly") return (t.weekdays ?? []).includes(date.getDay());
  if (t.repeat === "monthly" && t.day_of_month) {
    const dom = date.getDate();
    if (dom === t.day_of_month) return true;
    const lastDom = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return t.day_of_month > lastDom && dom === lastDom;
  }
  return false;
}

type InstanceRow = {
  id: string;
  template_id: string | null;
  date: string;
  part: Part;
  category: TaskCategory | null;
  title: string;
  status: TaskStatus;
  note: string | null;
  is_extra: boolean;
  actioned_at: string | null;
  actioned_by: { first_name: string; surname: string } | null;
  claimed_by: { id: string; first_name: string; surname: string } | null;
};

const INSTANCE_SELECT =
  "id, template_id, date, part, category, title, status, note, is_extra, actioned_at, " +
  "actioned_by:people!task_instance_actioned_by_fkey(first_name, surname), " +
  "claimed_by:people!task_instance_claimed_by_fkey(id, first_name, surname)";

function toRow(r: InstanceRow, carriedOver: boolean): ShiftTaskRow {
  return {
    id: r.id,
    templateId: r.template_id,
    date: r.date,
    part: r.part,
    category: r.category,
    title: r.title,
    status: r.status,
    note: r.note,
    isExtra: r.is_extra,
    claimedById: r.claimed_by?.id ?? null,
    claimedByName: r.claimed_by ? `${r.claimed_by.first_name} ${r.claimed_by.surname}`.trim() : null,
    actionedByName: r.actioned_by ? `${r.actioned_by.first_name} ${r.actioned_by.surname}`.trim() : null,
    actionedByInitials: r.actioned_by ? initials(r.actioned_by.first_name, r.actioned_by.surname) : null,
    actionedAt: r.actioned_at,
    carriedOver,
  };
}

/** Today's checklist, grouped by category, plus anything still open from
 *  earlier days ("carried over") and today's extras kept separate. Only
 *  supports "today" for now (shelterToday()). History/future-preview can
 *  follow later, same as the old Staff tab had, if it's wanted here too. */
export async function getShiftChecklist(): Promise<{
  byCategory: Record<TaskCategory, ShiftTaskRow[]>;
  carriedOver: ShiftTaskRow[];
  extras: ShiftTaskRow[];
}> {
  const supabase = await createClient();
  const date = shelterToday();
  const target = new Date();

  const { data: templatesRaw } = await supabase
    .from("task_template")
    .select("id, title, part, category, repeat, weekdays, day_of_month, sort_order")
    .eq("active", true);
  const dueTemplates = ((templatesRaw ?? []) as TemplateForGen[]).filter((t) =>
    templateMatchesDate(t, target),
  );

  if (dueTemplates.length) {
    const { data: have } = await supabase
      .from("task_instance")
      .select("template_id")
      .eq("date", date)
      .not("template_id", "is", null);
    const haveIds = new Set((have ?? []).map((h) => h.template_id));
    const toCreate = dueTemplates.filter((t) => !haveIds.has(t.id));
    if (toCreate.length) {
      const { error: insErr } = await supabase.from("task_instance").insert(
        toCreate.map((t) => ({
          template_id: t.id,
          date,
          part: t.part,
          category: t.category,
          title: t.title,
          sort_order: t.sort_order,
        })),
      );
      if (insErr && insErr.code !== "23505") console.error("shift checklist materialise failed", insErr);
    }
  }

  const { data: todayRows, error: tErr } = await supabase
    .from("task_instance")
    .select(INSTANCE_SELECT)
    .eq("date", date)
    .order("category")
    .order("sort_order")
    .order("created_at");
  if (tErr) console.error("getShiftChecklist: today read failed", tErr);

  const { data: openRows, error: oErr } = await supabase
    .from("task_instance")
    .select(INSTANCE_SELECT)
    .eq("status", "open")
    .lt("date", date)
    .order("date")
    .order("category")
    .order("sort_order");
  if (oErr) console.error("getShiftChecklist: carried read failed", oErr);

  const byCategory = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, [] as ShiftTaskRow[]])) as Record<
    TaskCategory,
    ShiftTaskRow[]
  >;
  const extras: ShiftTaskRow[] = [];

  for (const r of (todayRows ?? []) as unknown as InstanceRow[]) {
    const row = toRow(r, false);
    if (row.isExtra) extras.push(row);
    else if (row.category) byCategory[row.category].push(row);
  }

  const carriedOver = ((openRows ?? []) as unknown as InstanceRow[]).map((r) => toRow(r, true));

  return { byCategory, carriedOver, extras };
}

// ---------------------------------------------------------------------------
// Handover
// ---------------------------------------------------------------------------

export type HandoverNoteRow = {
  id: string;
  personName: string;
  date: string;
  part: Part;
  body: string;
  createdAt: string;
};

/** Most recent handover notes, newest first. */
export async function getHandoverNotes(limit = 30): Promise<HandoverNoteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handover_note")
    .select("id, date, part, body, created_at, person:people(first_name, surname)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getHandoverNotes failed", error);

  return ((data ?? []) as unknown as Array<{
    id: string;
    date: string;
    part: Part;
    body: string;
    created_at: string;
    person: { first_name: string; surname: string } | null;
  }>).map((r) => ({
    id: r.id,
    personName: r.person ? `${r.person.first_name} ${r.person.surname}`.trim() : "Unknown",
    date: r.date,
    part: r.part,
    body: r.body,
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Roster (read-only view, editing still happens on the old dog-app Staff
// tab for now; see docs/staff-app-plan.md)
// ---------------------------------------------------------------------------

export type RosterCell = { am: string[]; pm: string[] };

/** One day per calendar cell, each person's name reduced to initials
 *  (e.g. "Taylor" -> "T", "Ash" -> "A") so a month grid stays legible. */
function shortInitial(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return (first.charAt(0) || "?").toUpperCase();
}

/** Every rostered day in `year`-`month` (1-12), keyed by "YYYY-MM-DD". A
 *  day with nothing rostered simply won't have a key. */
export async function getMonthRoster(year: number, month: number): Promise<Record<string, RosterCell>> {
  const supabase = await createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("roster_session")
    .select("date, part, roster_assignment(person:people(first_name, surname))")
    .gte("date", from)
    .lte("date", to);
  if (error) console.error("getMonthRoster failed", error);

  const grid: Record<string, RosterCell> = {};
  for (const s of (data ?? []) as unknown as Array<{
    date: string;
    part: Part;
    roster_assignment: { person: { first_name: string; surname: string } | null }[] | null;
  }>) {
    const names = (s.roster_assignment ?? [])
      .map((a) => (a.person ? shortInitial(`${a.person.first_name} ${a.person.surname}`) : null))
      .filter((n): n is string => n !== null);
    if (names.length === 0) continue;
    const cell = (grid[s.date] ??= { am: [], pm: [] });
    if (s.part === "morning") cell.am = names;
    else cell.pm = names;
  }
  return grid;
}

export type RosterDaySession = { part: Part; starts: string; ends: string; people: string[] };

/** One day's roster in full (both sessions, full names) for the day-detail
 *  card under the month grid. */
export async function getRosterDayDetail(date: string): Promise<RosterDaySession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roster_session")
    .select("part, starts, ends, roster_assignment(person:people(first_name, surname))")
    .eq("date", date);
  if (error) console.error("getRosterDayDetail failed", error);

  const byPart = new Map<Part, RosterDaySession>();
  for (const s of (data ?? []) as unknown as Array<{
    part: Part;
    starts: string;
    ends: string;
    roster_assignment: { person: { first_name: string; surname: string } | null }[] | null;
  }>) {
    byPart.set(s.part, {
      part: s.part,
      starts: String(s.starts).slice(0, 5),
      ends: String(s.ends).slice(0, 5),
      people: (s.roster_assignment ?? [])
        .map((a) => (a.person ? `${a.person.first_name} ${a.person.surname}`.trim() : null))
        .filter((n): n is string => n !== null),
    });
  }
  return (["morning", "afternoon"] as Part[]).map(
    (part) => byPart.get(part) ?? { part, starts: DEFAULT_TIMES[part].starts, ends: DEFAULT_TIMES[part].ends, people: [] },
  );
}

// ---------------------------------------------------------------------------
// End-of-shift email
// ---------------------------------------------------------------------------

/** Renee, Shayna, whoever, set from the settings screen, never in code. */
export async function getShiftEmailRecipients(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("org_settings").select("staff_shift_email_recipients").maybeSingle();
  return data?.staff_shift_email_recipients ?? [];
}

export type SessionShiftRow = {
  personName: string;
  startedAt: string;
  endedAt: string | null;
  lateMinutes: number | null;
  lateReason: string | null;
  distanceM: number | null;
  autoClosed: boolean;
};

/** Every sign-in against (date, part), closed or not. The per-person
 *  blocks in the summary email are built from this. */
export async function getSessionShifts(date: string, part: Part): Promise<SessionShiftRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_log")
    .select(
      "signed_in_at, signed_out_at, late_minutes, late_reason, signed_in_distance_m, auto_closed, " +
        "person:people(first_name, surname)",
    )
    .eq("date", date)
    .eq("part", part)
    .order("signed_in_at");
  if (error) console.error("getSessionShifts failed", error);

  return ((data ?? []) as unknown as Array<{
    signed_in_at: string;
    signed_out_at: string | null;
    late_minutes: number | null;
    late_reason: string | null;
    signed_in_distance_m: number | null;
    auto_closed: boolean;
    person: { first_name: string; surname: string } | null;
  }>).map((r) => ({
    personName: r.person ? `${r.person.first_name} ${r.person.surname}`.trim() : "Unknown",
    startedAt: r.signed_in_at,
    endedAt: r.signed_out_at,
    lateMinutes: r.late_minutes,
    lateReason: r.late_reason,
    distanceM: r.signed_in_distance_m,
    autoClosed: r.auto_closed,
  }));
}

/** Are there any shifts still open against (date, part)? While there are,
 *  the summary email waits, it covers the whole session, not one person. */
export async function hasOpenShiftsForSession(date: string, part: Part): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("shift_log")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("part", part)
    .is("signed_out_at", null);
  if (error) console.error("hasOpenShiftsForSession failed", error);
  return (count ?? 0) > 0;
}

export type SessionTasksRow = ShiftTaskRow;

/** Every task instance for (date, part): done, not needed, still open,
 *  extras included. For building the email's per-person breakdown. */
export async function getSessionTasks(date: string, part: Part): Promise<SessionTasksRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instance")
    .select(INSTANCE_SELECT)
    .eq("date", date)
    .eq("part", part);
  if (error) console.error("getSessionTasks failed", error);
  return ((data ?? []) as unknown as InstanceRow[]).map((r) => toRow(r, false));
}
