"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { shiftDay, type Part, type RepeatKind } from "@/lib/staff";

type Result = { error: string } | { error?: undefined };

async function requireStaff() {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return null;
  return me;
}
async function requireAdmin() {
  const me = await getCurrentPerson();
  if (!me?.isAdmin || !me.id) return null;
  return me;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function bust(date: string) {
  revalidatePath("/staff");
  void date;
}

// ---------------------------------------------------------------------------
// ROSTER  (admin)
// ---------------------------------------------------------------------------

/** Ensure a session row exists for (date, part); returns its id. */
async function ensureSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
  part: Part,
): Promise<string | null> {
  const { data: found } = await supabase
    .from("roster_session")
    .select("id")
    .eq("date", date)
    .eq("part", part)
    .maybeSingle();
  if (found?.id) return found.id;

  const { data: settings } = await supabase
    .from("org_settings")
    .select(
      "roster_morning_start, roster_morning_end, roster_afternoon_start, roster_afternoon_end",
    )
    .maybeSingle();
  const starts =
    part === "morning"
      ? (settings?.roster_morning_start ?? "06:00")
      : (settings?.roster_afternoon_start ?? "16:00");
  const ends =
    part === "morning"
      ? (settings?.roster_morning_end ?? "09:00")
      : (settings?.roster_afternoon_end ?? "19:00");

  const { data: created, error } = await supabase
    .from("roster_session")
    .insert({ date, part, starts, ends })
    .select("id")
    .single();
  if (error) {
    // Someone else created it in the gap — read it back.
    const { data: retry } = await supabase
      .from("roster_session")
      .select("id")
      .eq("date", date)
      .eq("part", part)
      .maybeSingle();
    return retry?.id ?? null;
  }
  return created.id;
}

export async function setSessionTimes(
  date: string,
  part: Part,
  starts: string,
  ends: string,
): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  if (!HHMM.test(starts) || !HHMM.test(ends)) return { error: "Enter times as HH:MM." };
  if (starts >= ends) return { error: "The end time must be after the start time." };

  const supabase = await createClient();
  const id = await ensureSession(supabase, date, part);
  if (!id) return { error: "Couldn't open that session." };

  const { error } = await supabase.from("roster_session").update({ starts, ends }).eq("id", id);
  if (error) return { error: error.message };
  bust(date);
  return {};
}

export async function assignToSession(date: string, part: Part, personId: string): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const supabase = await createClient();
  const id = await ensureSession(supabase, date, part);
  if (!id) return { error: "Couldn't open that session." };

  const { error } = await supabase
    .from("roster_assignment")
    .insert({ session_id: id, person_id: personId });
  if (error && error.code !== "23505") return { error: error.message };
  bust(date);
  return {};
}

export async function unassignFromSession(
  date: string,
  part: Part,
  personId: string,
): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("roster_session")
    .select("id")
    .eq("date", date)
    .eq("part", part)
    .maybeSingle();
  if (!session?.id) return {};

  const { error } = await supabase
    .from("roster_assignment")
    .delete()
    .eq("session_id", session.id)
    .eq("person_id", personId);
  if (error) return { error: error.message };
  bust(date);
  return {};
}

/** Copy the same weekday from 7 days earlier — both sessions' times and
 *  the people on them — onto `date`, replacing whatever's there. */
export async function copyLastWeek(date: string): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const supabase = await createClient();
  const source = shiftDay(date, -7);

  const { data: srcSessions } = await supabase
    .from("roster_session")
    .select("part, starts, ends, roster_assignment(person_id)")
    .eq("date", source);
  if (!srcSessions || srcSessions.length === 0) {
    return { error: "Nothing rostered on that day last week to copy." };
  }

  for (const s of srcSessions as Array<{
    part: Part;
    starts: string;
    ends: string;
    roster_assignment: { person_id: string }[] | null;
  }>) {
    const id = await ensureSession(supabase, date, s.part);
    if (!id) continue;
    await supabase.from("roster_session").update({ starts: s.starts, ends: s.ends }).eq("id", id);
    await supabase.from("roster_assignment").delete().eq("session_id", id);
    const rows = (s.roster_assignment ?? []).map((a) => ({ session_id: id, person_id: a.person_id }));
    if (rows.length) await supabase.from("roster_assignment").insert(rows);
  }
  bust(date);
  return {};
}

// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------

export async function signOffTask(instanceId: string, note: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };
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
  bust("");
  return {};
}

export async function markTaskNotRequired(instanceId: string, note: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };
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
  bust("");
  return {};
}

export async function reopenTask(instanceId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({ status: "open", actioned_by: null, actioned_at: null })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  bust("");
  return {};
}

/** Save just the note against a task — no status change, no re-stamp.
 *  Used by the always-there note box on each task row. */
export async function updateTaskNote(instanceId: string, note: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .update({ note: note.trim() || null })
    .eq("id", instanceId);
  if (error) return { error: error.message };
  return {};
}

/** A one-off task for a specific day (no template). Admin only. */
export async function addAdhocTask(date: string, part: Part, title: string): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  if (!title.trim()) return { error: "Give the task a name." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instance")
    .insert({ date, part, title: title.trim(), sort_order: 100 });
  if (error) return { error: error.message };
  bust(date);
  return {};
}

export async function deleteAdhocTask(instanceId: string): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const supabase = await createClient();
  // Only ad-hoc (no template) instances can be deleted outright.
  const { error } = await supabase
    .from("task_instance")
    .delete()
    .eq("id", instanceId)
    .is("template_id", null);
  if (error) return { error: error.message };
  bust("");
  return {};
}

// ---------------------------------------------------------------------------
// RECURRING TASK TEMPLATES  (admin)
// ---------------------------------------------------------------------------

type TemplateInput = {
  title: string;
  part: Part;
  repeat: RepeatKind;
  weekdays: number[];
  dayOfMonth: number | null;
};

function validateTemplate(t: TemplateInput): string | null {
  if (!t.title.trim()) return "Give the task a name.";
  if (t.part !== "morning" && t.part !== "afternoon") return "Pick morning or afternoon.";
  if (t.repeat === "weekly" && t.weekdays.length === 0) return "Pick at least one day of the week.";
  if (t.repeat === "monthly" && !(t.dayOfMonth && t.dayOfMonth >= 1 && t.dayOfMonth <= 31))
    return "Pick a day of the month (1–31).";
  return null;
}

function templateFields(t: TemplateInput) {
  return {
    title: t.title.trim(),
    part: t.part,
    repeat: t.repeat,
    weekdays: t.repeat === "weekly" ? [...new Set(t.weekdays)].sort((a, b) => a - b) : [],
    day_of_month: t.repeat === "monthly" ? t.dayOfMonth : null,
  };
}

export async function createTaskTemplate(t: TemplateInput): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  const bad = validateTemplate(t);
  if (bad) return { error: bad };

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_template")
    .insert({ ...templateFields(t), created_by: me.id });
  if (error) return { error: error.message };
  bust("");
  return {};
}

export async function updateTaskTemplate(id: string, t: TemplateInput): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const bad = validateTemplate(t);
  if (bad) return { error: bad };

  const supabase = await createClient();
  const { error } = await supabase.from("task_template").update(templateFields(t)).eq("id", id);
  if (error) return { error: error.message };
  bust("");
  return {};
}

/** Deactivate (keeps history) or reactivate a template. */
export async function setTemplateActive(id: string, active: boolean): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const supabase = await createClient();
  const { error } = await supabase.from("task_template").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  bust("");
  return {};
}

/** Hard delete. Past instances keep their title (template_id -> null). */
export async function deleteTaskTemplate(id: string): Promise<Result> {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const supabase = await createClient();
  const { error } = await supabase.from("task_template").delete().eq("id", id);
  if (error) return { error: error.message };
  bust("");
  return {};
}
