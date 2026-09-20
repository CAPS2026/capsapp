import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getRosterablePeople } from "@/lib/shift-data";
import { PART_LABEL, parseYmd, type Part } from "@/lib/shift";
import type { LeaveRequestRow, LeaveScope } from "@/lib/leave";

/** Who a leave request is for: whoever tapped their name on this tablet, or,
 *  on a phone, the caretaker who is logged in. Null means "ask who they are". */
export async function resolveRequester(): Promise<{ id: string; name: string } | null> {
  const active = await getActiveShiftPerson();
  if (active) return active;
  const me = await getCurrentPerson();
  if (!me?.id) return null;
  const people = await getRosterablePeople();
  const match = people.find((p) => p.id === me.id);
  return match ?? null;
}

/** Leave email recipients (Shayna and Renee). Empty means switched off. */
export async function getLeaveRecipients(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("org_settings").select("leave_request_email_recipients").maybeSingle();
  return data?.leave_request_email_recipients ?? [];
}

const LEAVE_SELECT =
  "id, person_id, leave_type, start_date, end_date, scope, note, status, decision_note, created_at, decided_at, " +
  "person:people!leave_request_person_id_fkey(first_name, surname)";

type RawLeave = {
  id: string;
  person_id: string;
  leave_type: LeaveRequestRow["leaveType"];
  start_date: string;
  end_date: string;
  scope: LeaveScope;
  note: string | null;
  status: LeaveRequestRow["status"];
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  person: { first_name: string; surname: string } | null;
};

export function toLeaveRow(r: RawLeave): LeaveRequestRow {
  return {
    id: r.id,
    personId: r.person_id,
    personName: r.person ? `${r.person.first_name} ${r.person.surname}`.trim() : "Unknown",
    leaveType: r.leave_type,
    startDate: r.start_date,
    endDate: r.end_date,
    scope: r.scope,
    note: r.note,
    status: r.status,
    decisionNote: r.decision_note,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
  };
}

/** One person's own requests, newest first. The reason is left out on
 *  purpose: this list shows on a shared tablet. */
export async function getMyLeaveRequests(personId: string): Promise<LeaveRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_request")
    .select(LEAVE_SELECT)
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) console.error("getMyLeaveRequests failed", error);
  return ((data ?? []) as unknown as RawLeave[]).map((r) => ({ ...toLeaveRow(r), note: null }));
}

/** Every request for the admin view: pending first, then the recent rest. */
export async function getAllLeaveRequests(): Promise<LeaveRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_request")
    .select(LEAVE_SELECT)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) console.error("getAllLeaveRequests failed", error);
  const rows = ((data ?? []) as unknown as RawLeave[]).map(toLeaveRow);
  return [...rows.filter((r) => r.status === "pending"), ...rows.filter((r) => r.status !== "pending")];
}

/** The request behind an email link. Uses the service-role client because
 *  the person opening the link is not logged in; the unguessable token is
 *  the only key. */
export async function getLeaveByToken(sb: SupabaseClient, token: string): Promise<LeaveRequestRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await sb.from("leave_request").select(LEAVE_SELECT).eq("token", token).maybeSingle();
  return data ? toLeaveRow(data as unknown as RawLeave) : null;
}

/** The sessions in a leave period the person is rostered on (respecting
 *  morning-only or afternoon-only), each with who else is on, plus other
 *  people's leave overlapping the period. Shown to whoever approves. */
export async function getLeaveContext(
  sb: SupabaseClient,
  req: { personId: string; startDate: string; endDate: string; scope: LeaveScope; id: string },
): Promise<{ affected: string[]; overlapping: string[] }> {
  const { data } = await sb
    .from("roster_session")
    .select("date, part, roster_assignment(person_id, person:people(first_name))")
    .gte("date", req.startDate)
    .lte("date", req.endDate)
    .order("date");

  const affected: string[] = [];
  for (const s of (data ?? []) as unknown as Array<{
    date: string;
    part: Part;
    roster_assignment: { person_id: string; person: { first_name: string } | null }[] | null;
  }>) {
    if (req.scope !== "all" && s.part !== req.scope) continue;
    const people = s.roster_assignment ?? [];
    if (!people.some((a) => a.person_id === req.personId)) continue;
    const others = people.filter((a) => a.person_id !== req.personId).map((a) => a.person?.first_name ?? "?");
    const day = parseYmd(s.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    affected.push(`${day}, ${PART_LABEL[s.part].toLowerCase()}${others.length ? ` (with ${others.join(", ")})` : " (on their own)"}`);
  }

  const { data: others } = await sb
    .from("leave_request")
    .select("start_date, end_date, status, person:people!leave_request_person_id_fkey(first_name)")
    .in("status", ["pending", "approved"])
    .neq("id", req.id)
    .neq("person_id", req.personId)
    .lte("start_date", req.endDate)
    .gte("end_date", req.startDate);
  const overlapping = ((others ?? []) as unknown as Array<{
    start_date: string;
    end_date: string;
    status: string;
    person: { first_name: string } | null;
  }>).map((o) => {
    const fmt = (s: string) => parseYmd(s).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    return `${o.person?.first_name ?? "Someone"}: ${o.start_date === o.end_date ? fmt(o.start_date) : `${fmt(o.start_date)} to ${fmt(o.end_date)}`} (${o.status})`;
  });

  return { affected, overlapping };
}
