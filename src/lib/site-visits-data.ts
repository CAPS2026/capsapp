import { createClient } from "@/lib/supabase/server";

export type OpenVisit = {
  id: string;
  displayName: string;
  reasonLabel: string;
  checkedIn: string;
};

export async function getOpenSiteVisits(): Promise<OpenVisit[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("site_visits")
    .select(
      "id, guest_name, checked_in, reason, reason_other, person:people!site_visits_person_id_fkey(first_name, surname), reason_ref:site_visit_reason!site_visits_reason_fkey(label)",
    )
    .is("checked_out", null)
    .order("checked_in", { ascending: true });

  return ((data ?? []) as unknown as Array<{
    id: string;
    guest_name: string | null;
    checked_in: string;
    reason: string;
    reason_other: string | null;
    person: { first_name: string; surname: string } | null;
    reason_ref: { label: string } | null;
  }>).map((v) => ({
    id: v.id,
    displayName: v.person ? `${v.person.first_name} ${v.person.surname}` : (v.guest_name ?? "Guest"),
    reasonLabel: v.reason === "other" && v.reason_other ? v.reason_other : (v.reason_ref?.label ?? v.reason),
    checkedIn: v.checked_in,
  }));
}

export async function listSiteVisitReasons(): Promise<{ code: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_visit_reason").select("code, label").order("sort_order");
  return data ?? [];
}

export type DayVisit = {
  id: string;
  displayName: string;
  reasonLabel: string;
  checkedIn: string;
  checkedOut: string | null;
};

/** Every visit that started today (viewer's local day), newest first —
 *  the "log for the day" under the board on /site. */
export async function getTodaySiteVisits(): Promise<DayVisit[]> {
  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const { data } = await supabase
    .from("site_visits")
    .select(
      "id, guest_name, checked_in, checked_out, reason, reason_other, person:people!site_visits_person_id_fkey(first_name, surname), reason_ref:site_visit_reason!site_visits_reason_fkey(label)",
    )
    .gte("checked_in", startOfDay)
    .order("checked_in", { ascending: false });

  return ((data ?? []) as unknown as Array<{
    id: string;
    guest_name: string | null;
    checked_in: string;
    checked_out: string | null;
    reason: string;
    reason_other: string | null;
    person: { first_name: string; surname: string } | null;
    reason_ref: { label: string } | null;
  }>).map((v) => ({
    id: v.id,
    displayName: v.person ? `${v.person.first_name} ${v.person.surname}` : (v.guest_name ?? "Guest"),
    reasonLabel: v.reason === "other" && v.reason_other ? v.reason_other : (v.reason_ref?.label ?? v.reason),
    checkedIn: v.checked_in,
    checkedOut: v.checked_out,
  }));
}
