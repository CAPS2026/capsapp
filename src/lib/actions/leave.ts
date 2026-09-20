"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";
import { setActiveShiftPerson, clearActiveShiftPerson } from "@/lib/shift-identity";
import { getRosterablePeople } from "@/lib/shift-data";
import { shelterToday } from "@/lib/shift";
import { LEAVE_SCOPES, LEAVE_TYPES, type LeaveScope, type LeaveType } from "@/lib/leave";
import { getLeaveByToken, getLeaveRecipients, resolveRequester, toLeaveRow } from "@/lib/leave-data";
import { sendLeaveDecisionEmail, sendLeaveRequestEmail } from "@/lib/leave-email";

type Result = { error?: string };

const SELECT =
  "id, person_id, leave_type, start_date, end_date, scope, note, status, decision_note, created_at, decided_at, " +
  "person:people!leave_request_person_id_fkey(first_name, surname)";

/** Say who you are on this tablet without starting a shift, so someone can
 *  ask for leave. Same trust as the sign-in screen: tap your name. */
export async function identifyPerson(personId: string): Promise<Result> {
  const device = await getCurrentPerson();
  if (!device?.isStaff) return { error: "Staff only." };
  const people = await getRosterablePeople();
  if (!people.some((p) => p.id === personId)) return { error: "That person wasn't found." };
  await setActiveShiftPerson(personId);
  revalidatePath("/shift/leave");
  return {};
}

/** Hand the tablet to someone else from the Leave tab. */
export async function forgetPerson(): Promise<void> {
  await clearActiveShiftPerson();
  revalidatePath("/shift/leave");
}

/** Saves the request, then emails it. `emailed` says whether the email
 *  actually went, so the screen never claims Shayna and Renee were told
 *  when they weren't. */
export async function submitLeaveRequest(input: {
  leaveType: string;
  startDate: string;
  endDate: string;
  scope: string;
  note: string;
}): Promise<{ error?: string; emailed?: boolean }> {
  const device = await getCurrentPerson();
  if (!device?.isStaff) return { error: "Staff only." };
  const me = await resolveRequester();
  if (!me) return { error: "Tap your name first." };

  if (!LEAVE_TYPES.includes(input.leaveType as LeaveType)) return { error: "Choose the type of leave." };
  if (!LEAVE_SCOPES.includes(input.scope as LeaveScope)) return { error: "Choose which shifts." };
  const dateOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!dateOk(input.startDate) || !dateOk(input.endDate)) return { error: "Choose the dates." };
  if (input.endDate < input.startDate) return { error: "The last day can't be before the first day." };
  if (input.startDate < shelterToday()) return { error: "The first day can't be in the past. If you're away today, phone Shayna." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_request")
    .insert({
      person_id: me.id,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      scope: input.scope,
      note: input.note.trim() || null,
    })
    .select(`${SELECT}, token`)
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save the request." };

  const row = toLeaveRow(data as unknown as Parameters<typeof toLeaveRow>[0]);
  const token = (data as unknown as { token: string }).token;
  const recipients = await getLeaveRecipients();
  const emailed = await sendLeaveRequestEmail(supabase as unknown as SupabaseClient, recipients, row, token).catch((e) => {
    console.error("submitLeaveRequest: email failed", e);
    return false;
  });
  if (emailed) await supabase.from("leave_request").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);

  revalidatePath("/shift/leave");
  return { emailed };
}

/** Withdraw your own request while it is still pending. */
export async function cancelLeaveRequest(id: string): Promise<Result> {
  const device = await getCurrentPerson();
  if (!device?.isStaff) return { error: "Staff only." };
  const me = await resolveRequester();
  if (!me) return { error: "Tap your name first." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("leave_request")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("person_id", me.id)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath("/shift/leave");
  return {};
}

/** Shared by the in-app buttons and the email link. Only a pending
 *  request can be decided, so a second click (or a second admin) can't
 *  flip a decision already made. */
async function decide(
  sb: SupabaseClient,
  match: { column: "id" | "token"; value: string },
  decision: "approved" | "declined",
  note: string,
  by: { id: string | null; via: "app" | "email" },
): Promise<Result> {
  const { data, error } = await sb
    .from("leave_request")
    .update({
      status: decision,
      decided_by: by.id,
      decided_via: by.via,
      decided_at: new Date().toISOString(),
      decision_note: note.trim() || null,
    })
    .eq(match.column, match.value)
    .eq("status", "pending")
    .select(SELECT)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This request has already been decided or withdrawn." };

  const row = toLeaveRow(data as unknown as Parameters<typeof toLeaveRow>[0]);
  const { data: person } = await sb.from("people").select("email").eq("id", row.personId).maybeSingle();
  await sendLeaveDecisionEmail(person?.email ?? null, row);
  return {};
}

/** Approve or decline from the Leave tab (admins only). */
export async function decideLeaveRequest(id: string, decision: "approved" | "declined", note: string): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) return { error: "Admin only." };
  const supabase = await createClient();
  const r = await decide(supabase as unknown as SupabaseClient, { column: "id", value: id }, decision, note, {
    id: me.id || null,
    via: "app",
  });
  revalidatePath("/shift/leave");
  return r;
}

/** Approve or decline from the link in the email. The person is not logged
 *  in, so this uses the service-role client and the unguessable token is
 *  the only key. Nothing happens on opening the link, only on pressing a
 *  button, so a mail scanner pre-fetching it can't decide anything. */
export async function decideLeaveByToken(token: string, decision: "approved" | "declined", note: string): Promise<Result> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "This link isn't valid." };
  const admin = createAdminClient() as unknown as SupabaseClient;
  const existing = await getLeaveByToken(admin, token);
  if (!existing) return { error: "This link isn't valid." };
  return decide(admin, { column: "token", value: token }, decision, note, { id: null, via: "email" });
}
