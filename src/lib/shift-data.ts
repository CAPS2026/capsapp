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

/** The rostered session's start time ("HH:MM"), if `part` is rostered
 *  at all on `date`. Used to work out how late a sign-in is. */
async function getSessionStart(date: string, part: Part): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roster_session")
    .select("starts")
    .eq("date", date)
    .eq("part", part)
    .maybeSingle();
  return data?.starts ? String(data.starts).slice(0, 5) : null;
}

/** The person's currently open (not signed out) shift, if any, today. */
export async function getOpenShift(personId: string): Promise<OpenShift | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_log")
    .select("id, person_id, part, signed_in_at, late_minutes, late_reason, roster_session_id")
    .eq("person_id", personId)
    .is("signed_out_at", null)
    .maybeSingle();
  if (error) console.error("getOpenShift failed", error);
  if (!data) return null;
  return {
    id: data.id,
    personId: data.person_id,
    part: data.part,
    startedAt: data.signed_in_at,
    lateMinutes: data.late_minutes,
    lateReason: data.late_reason,
    rostered: data.roster_session_id !== null,
  };
}

/** Distance from the shelter, in metres. Null if either point is missing. */
export async function distanceFromShelter(lat: number | null, lng: number | null): Promise<number | null> {
  if (lat == null || lng == null) return null;
  const { shelterLat, shelterLng } = await getShiftSettings();
  if (shelterLat == null || shelterLng == null) return null;
  return Math.round(distanceMetres(lat, lng, shelterLat, shelterLng));
}

/** How late (minutes, null if not late / not rostered) a sign-in at `at`
 *  is against `date`/`part`'s rostered start. */
export async function lateMinutesFor(date: string, part: Part, at: Date): Promise<number | null> {
  const start = await getSessionStart(date, part);
  if (!start) return null;
  const late = minutesLate(at, start);
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
