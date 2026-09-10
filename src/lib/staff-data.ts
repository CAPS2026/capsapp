import { createClient } from "@/lib/supabase/server";
import {
  initials,
  parseYmd,
  shelterToday,
  templateMatchesDate,
  type Part,
  type RosterPerson,
  type RosterSession,
  type TaskRow,
  type TaskStatus,
  type TaskTemplateRow,
} from "@/lib/staff";

const DEFAULT_TIMES: Record<Part, { starts: string; ends: string }> = {
  morning: { starts: "06:00", ends: "09:00" },
  afternoon: { starts: "16:00", ends: "19:00" },
};

/** People who can be put on the roster — active staff / committee / admin. */
export async function getRosterablePeople(): Promise<RosterPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_roles")
    .select("person:people!person_roles_person_id_fkey(id, first_name, surname)")
    .in("role", ["staff", "committee", "admin"])
    .eq("status", "active");
  if (error) console.error("getRosterablePeople failed", error);

  const seen = new Set<string>();
  const out: RosterPerson[] = [];
  for (const r of (data ?? []) as unknown as Array<{
    person: { id: string; first_name: string; surname: string } | null;
  }>) {
    if (!r.person || seen.has(r.person.id)) continue;
    seen.add(r.person.id);
    out.push({ id: r.person.id, name: `${r.person.first_name} ${r.person.surname}`.trim() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function defaultTimes(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("org_settings")
    .select(
      "roster_morning_start, roster_morning_end, roster_afternoon_start, roster_afternoon_end",
    )
    .maybeSingle();
  const hhmm = (t: string | null, fb: string) => (t ? String(t).slice(0, 5) : fb);
  return {
    morning: {
      starts: hhmm(data?.roster_morning_start ?? null, DEFAULT_TIMES.morning.starts),
      ends: hhmm(data?.roster_morning_end ?? null, DEFAULT_TIMES.morning.ends),
    },
    afternoon: {
      starts: hhmm(data?.roster_afternoon_start ?? null, DEFAULT_TIMES.afternoon.starts),
      ends: hhmm(data?.roster_afternoon_end ?? null, DEFAULT_TIMES.afternoon.ends),
    },
  };
}

/** The roster for one day: both sessions (created from the org defaults if
 *  they don't exist yet) with their assigned people. */
export async function getRosterDay(date: string): Promise<RosterSession[]> {
  const supabase = await createClient();
  const times = await defaultTimes(supabase);

  // Make sure both session rows exist; keep existing ones untouched.
  const { error: upErr } = await supabase.from("roster_session").upsert(
    (["morning", "afternoon"] as Part[]).map((p) => ({
      date,
      part: p,
      starts: times[p].starts,
      ends: times[p].ends,
    })),
    { onConflict: "date,part", ignoreDuplicates: true },
  );
  if (upErr) console.error("getRosterDay: ensure sessions failed", upErr);

  const { data: existing, error } = await supabase
    .from("roster_session")
    .select("id, part, starts, ends, roster_assignment(person_id)")
    .eq("date", date);
  if (error) console.error("getRosterDay failed", error);

  const byPart = new Map<string, { id: string; part: Part; starts: string; ends: string; personIds: string[] }>();
  for (const s of (existing ?? []) as unknown as Array<{
    id: string;
    part: Part;
    starts: string;
    ends: string;
    roster_assignment: { person_id: string }[] | null;
  }>) {
    byPart.set(s.part, {
      id: s.id,
      part: s.part,
      starts: String(s.starts).slice(0, 5),
      ends: String(s.ends).slice(0, 5),
      personIds: (s.roster_assignment ?? []).map((a) => a.person_id),
    });
  }

  const people = await getRosterablePeople();
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return (["morning", "afternoon"] as Part[]).map((part) => {
    const s = byPart.get(part) ?? {
      id: "",
      part,
      starts: times[part].starts,
      ends: times[part].ends,
      personIds: [] as string[],
    };
    return {
      id: s.id,
      part,
      starts: s.starts,
      ends: s.ends,
      people: s.personIds
        .map((id) => ({ id, name: nameById.get(id) ?? "Unknown" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}

type InstanceRow = {
  id: string;
  template_id: string | null;
  date: string;
  part: Part;
  title: string;
  status: TaskStatus;
  note: string | null;
  actioned_at: string | null;
  actioned_by: { first_name: string; surname: string } | null;
};

const INSTANCE_SELECT =
  "id, template_id, date, part, title, status, note, actioned_at, actioned_by:people!task_instance_actioned_by_fkey(first_name, surname)";

function toTaskRow(r: InstanceRow, carriedOver: boolean): TaskRow {
  return {
    id: r.id,
    templateId: r.template_id,
    date: r.date,
    part: r.part,
    title: r.title,
    status: r.status,
    note: r.note,
    actionedByName: r.actioned_by ? `${r.actioned_by.first_name} ${r.actioned_by.surname}` : null,
    actionedByInitials: r.actioned_by
      ? initials(r.actioned_by.first_name, r.actioned_by.surname)
      : null,
    actionedAt: r.actioned_at,
    carriedOver,
    isPreview: false,
  };
}

type TemplateForGen = {
  id: string;
  title: string;
  part: Part;
  repeat: TaskTemplateRow["repeat"];
  weekdays: number[] | null;
  day_of_month: number | null;
  sort_order: number;
};

/**
 * Tasks for a day.
 *  - Today (shelter time): materialise the day's instances from the active
 *    templates that fire, then return them + every still-open instance from
 *    earlier days ("carried over").
 *  - A past day: its real instances only (history).
 *  - A future day: a read-only preview of the recurring tasks that will
 *    fire that day (isPreview), plus its real instances if any were already
 *    added ad-hoc.
 */
export async function getTasksForDay(date: string): Promise<{
  today: TaskRow[];
  carriedOver: TaskRow[];
}> {
  const supabase = await createClient();
  const today = shelterToday();
  const target = parseYmd(date);
  const isPast = date < today;
  const isFuture = date > today;

  const { data: templatesRaw } = await supabase
    .from("task_template")
    .select("id, title, part, repeat, weekdays, day_of_month, sort_order")
    .eq("active", true);
  const dueTemplates = ((templatesRaw ?? []) as TemplateForGen[]).filter((t) =>
    templateMatchesDate(
      { repeat: t.repeat, weekdays: t.weekdays ?? [], dayOfMonth: t.day_of_month },
      target,
    ),
  );

  // Materialise today's due templates that don't have an instance yet.
  if (date === today && dueTemplates.length) {
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
          title: t.title,
          sort_order: t.sort_order,
        })),
      );
      // 23505 = another request materialised the same day first — fine.
      if (insErr && insErr.code !== "23505") console.error("task materialise failed", insErr);
    }
  }

  // This day's real instances.
  const { data: todayRows, error: tErr } = await supabase
    .from("task_instance")
    .select(INSTANCE_SELECT)
    .eq("date", date)
    .order("part")
    .order("sort_order")
    .order("created_at");
  if (tErr) console.error("getTasksForDay: today read failed", tErr);

  const realRows = ((todayRows ?? []) as unknown as InstanceRow[]).map((r) => toTaskRow(r, false));

  // Future day: show the recurring tasks that will appear, as previews
  // (skip any template that's already been added ad-hoc for that day).
  if (isFuture) {
    const covered = new Set(realRows.map((r) => r.templateId).filter(Boolean));
    const previews: TaskRow[] = dueTemplates
      .filter((t) => !covered.has(t.id))
      .map((t) => ({
        id: `preview:${t.id}`,
        templateId: t.id,
        date,
        part: t.part,
        title: t.title,
        status: "open" as TaskStatus,
        note: null,
        actionedByName: null,
        actionedByInitials: null,
        actionedAt: null,
        carriedOver: false,
        isPreview: true,
      }));
    return { today: [...realRows, ...previews], carriedOver: [] };
  }

  // Carried over — open instances from earlier days. Not shown when
  // browsing history.
  let carried: TaskRow[] = [];
  if (!isPast) {
    const { data: openRows, error: oErr } = await supabase
      .from("task_instance")
      .select(INSTANCE_SELECT)
      .eq("status", "open")
      .lt("date", date)
      .order("date")
      .order("part")
      .order("sort_order");
    if (oErr) console.error("getTasksForDay: carried read failed", oErr);
    carried = ((openRows ?? []) as unknown as InstanceRow[]).map((r) => toTaskRow(r, true));
  }

  return { today: realRows, carriedOver: carried };
}

export async function getTaskTemplates(): Promise<TaskTemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_template")
    .select("id, title, part, repeat, weekdays, day_of_month, active, sort_order")
    .order("active", { ascending: false })
    .order("part")
    .order("sort_order")
    .order("title");
  if (error) console.error("getTaskTemplates failed", error);

  return ((data ?? []) as Array<{
    id: string;
    title: string;
    part: Part;
    repeat: TaskTemplateRow["repeat"];
    weekdays: number[] | null;
    day_of_month: number | null;
    active: boolean;
  }>).map((t) => ({
    id: t.id,
    title: t.title,
    part: t.part,
    repeat: t.repeat,
    weekdays: t.weekdays ?? [],
    dayOfMonth: t.day_of_month,
    active: t.active,
  }));
}
