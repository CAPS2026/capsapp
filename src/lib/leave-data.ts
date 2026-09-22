import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { getLeaveIdentity } from "@/lib/leave-identity";
import { getRosterablePeople } from "@/lib/shift-data";
import { PART_LABEL, parseYmd, type Part } from "@/lib/shift";
import type { LeaveRequestRow, LeaveScope, RosterLeave } from "@/lib/leave";

/** Who a leave request is for: whoever tapped their name in the "Ask for
 *  leave" pop-up (its own cookie, see leave-identity.ts), or, on a phone,
 *  the caretaker who is logged in. Deliberately never reads who's on
 *  shift: picking a name here must never change who the sidebar and
 *  checklist think is currently signed in. `via` says which, so a shared
 *  tablet always asks who is using it while a phone login does not. */
export async function resolveRequester(): Promise<{ id: string; name: string; via: "cookie" | "login" } | null> {
  const picked = await getLeaveIdentity();
  if (picked) return { ...picked, via: "cookie" };
  const me = await getCurrentPerson();
  if (!me?.id) return null;
  const people = await getRosterablePeople();
  const match = people.find((p) => p.id === me.id);
  return match ? { ...match, via: "login" } : null;
}

/** Who gets the leave email. Deciders get the Approve/Decline link
 *  (Shayna); the informed list gets a copy for information (Renee) and a
 *  short note of the outcome. Empty deciders means switched off. */
export async function getLeaveRecipients(sb?: SupabaseClient): Promise<{ deciders: string[]; informed: string[] }> {
  const supabase = sb ?? ((await createClient()) as unknown as SupabaseClient);
  const { data } = await supabase.from("org_settings").select("leave_decider_emails, leave_inform_emails").maybeSingle();
  return { deciders: data?.leave_decider_emails ?? [], informed: data?.leave_inform_emails ?? [] };
}

const LEAVE_SELECT =
  "id, person_id, start_date, end_date, scope, note, status, decision_note, created_at, decided_at, " +
  "person:people!leave_request_person_id_fkey(first_name, surname)";

type RawLeave = {
  id: string;
  person_id: string;
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
 *  purpose: this shows on a shared tablet. */
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

/** Approved leave overlapping [from, to], for the roster. Only names and
 *  dates: no reason, and nothing about pending or declined requests. */
export async function getApprovedLeave(from: string, to: string): Promise<RosterLeave[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_request")
    .select("id, person_id, start_date, end_date, scope, person:people!leave_request_person_id_fkey(first_name, surname)")
    .eq("status", "approved")
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date");
  if (error) console.error("getApprovedLeave failed", error);
  return ((data ?? []) as unknown as Array<{
    id: string;
    person_id: string;
    start_date: string;
    end_date: string;
    scope: LeaveScope;
    person: { first_name: string; surname: string } | null;
  }>).map((r) => ({
    id: r.id,
    personId: r.person_id,
    name: r.person ? `${r.person.first_name} ${r.person.surname}`.trim() : "Unknown",
    startDate: r.start_date,
    endDate: r.end_date,
    scope: r.scope,
  }));
}

/** Decisions to show in the sidebar for this shift only: they were marked
 *  for this shift when the person signed in (see markLeaveNoticesForShift),
 *  so they appear the first time after the decision and never again. */
export async function getLeaveNoticesForShift(
  shiftId: string,
): Promise<{ id: string; status: "approved" | "declined"; startDate: string; endDate: string; message: string | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_request")
    .select("id, status, start_date, end_date, decision_note")
    .eq("shown_in_shift", shiftId)
    // A request tied to this shift can later be cancelled by an admin (see
    // cancelApprovedLeave); without this filter it would still show here,
    // wrongly rendered as "declined" (the card only knows approved/declined).
    .in("status", ["approved", "declined"]);
  if (error) console.error("getLeaveNoticesForShift failed", error);
  return ((data ?? []) as unknown as Array<{
    id: string;
    status: "approved" | "declined";
    start_date: string;
    end_date: string;
    decision_note: string | null;
  }>).map((r) => ({ id: r.id, status: r.status, startDate: r.start_date, endDate: r.end_date, message: r.decision_note }));
}

/** On sign-in: any decision this person has not yet been shown gets tied to
 *  this shift, so the sidebar shows it once. */
export async function markLeaveNoticesForShift(personId: string, shiftId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leave_request")
    .update({ shown_in_shift: shiftId })
    .eq("person_id", personId)
    .in("status", ["approved", "declined"])
    .is("shown_in_shift", null);
  if (error) console.error("markLeaveNoticesForShift failed", error);
}

/** This person's own pending or approved requests that overlap
 *  [startDate, endDate], so a new one can be refused with a clear reason
 *  instead of silently sitting alongside a request that already covers
 *  some of the same days. */
export async function getOwnOverlappingLeave(
  personId: string,
  startDate: string,
  endDate: string,
): Promise<{ startDate: string; endDate: string; status: "pending" | "approved" }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_request")
    .select("start_date, end_date, status")
    .eq("person_id", personId)
    .in("status", ["pending", "approved"])
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  if (error) console.error("getOwnOverlappingLeave failed", error);
  return ((data ?? []) as unknown as Array<{ start_date: string; end_date: string; status: "pending" | "approved" }>).map(
    (r) => ({ startDate: r.start_date, endDate: r.end_date, status: r.status }),
  );
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
 *  people's leave overlapping the period. Shown to whoever decides. */
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
