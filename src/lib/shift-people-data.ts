// Reads for the staff app's own Add / Edit / Remove staff screens
// (/shift/staff), admin only. Copied in spirit from the dog app's People
// area, never imported from it: the two apps stay separate.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PART_LABEL, parseYmd, shelterToday, type Part } from "@/lib/shift";

/** The roles the staff app hands out. "staff" is shown as Caretaker. */
export type StaffRole = "staff" | "admin" | "volunteer";

export type StaffListRow = {
  id: string;
  name: string;
  email: string | null;
  roles: StaffRole[];
  hasLogin: boolean;
};

export type StaffMember = {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  ecName: string;
  ecPhone: string;
  ecRelationship: string;
  ecEmail: string;
  medicalIssues: string;
  roles: StaffRole[];
  hasLogin: boolean;
};

const STAFF_ROLES: StaffRole[] = ["staff", "admin", "volunteer"];

/** Emails that already have a login, lower-cased. Logins live in Supabase
 *  Auth, which only the service role can read. */
export async function loginEmails(): Promise<Set<string>> {
  const admin = createAdminClient();
  const out = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("loginEmails failed", error);
      break;
    }
    for (const u of data.users) if (u.email) out.add(u.email.toLowerCase());
    if (data.users.length < 200) break;
  }
  return out;
}

/** Everyone who is currently a caretaker or an admin: the people the staff
 *  app manages. Removed people (all roles ended) drop off this list. */
export async function listStaff(): Promise<StaffListRow[]> {
  const supabase = await createClient();
  const [{ data, error }, logins] = await Promise.all([
    supabase
      .from("person_roles")
      .select("role, person:people!person_roles_person_id_fkey(id, first_name, surname, email)")
      .in("role", ["staff", "admin"])
      .eq("status", "active"),
    loginEmails(),
  ]);
  if (error) console.error("listStaff failed", error);

  const people = new Map<string, { id: string; name: string; email: string | null }>();
  for (const r of (data ?? []) as unknown as Array<{
    person: { id: string; first_name: string; surname: string; email: string | null } | null;
  }>) {
    if (r.person) {
      people.set(r.person.id, {
        id: r.person.id,
        name: `${r.person.first_name} ${r.person.surname}`.trim(),
        email: r.person.email,
      });
    }
  }
  if (people.size === 0) return [];

  const { data: roleRows } = await supabase
    .from("person_roles")
    .select("person_id, role")
    .in("person_id", [...people.keys()])
    .eq("status", "active");
  const rolesBy = new Map<string, StaffRole[]>();
  for (const r of (roleRows ?? []) as Array<{ person_id: string; role: string }>) {
    if (!STAFF_ROLES.includes(r.role as StaffRole)) continue;
    rolesBy.set(r.person_id, [...(rolesBy.get(r.person_id) ?? []), r.role as StaffRole]);
  }

  return [...people.values()]
    .map((p) => ({
      ...p,
      roles: rolesBy.get(p.id) ?? [],
      hasLogin: p.email ? logins.has(p.email.toLowerCase()) : false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One person's details for the Edit screen. */
export async function getStaffMember(id: string): Promise<StaffMember | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("people")
    .select("id, first_name, surname, email, phone, date_of_birth, address, ec_name, ec_phone, ec_relationship, ec_email")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const [{ data: roleRows }, { data: vp }, logins] = await Promise.all([
    supabase.from("person_roles").select("role").eq("person_id", id).eq("status", "active"),
    supabase.from("volunteer_profile").select("medical_issues").eq("person_id", id).maybeSingle(),
    loginEmails(),
  ]);

  return {
    id: p.id,
    firstName: p.first_name,
    surname: p.surname,
    email: p.email ?? "",
    phone: p.phone ?? "",
    dateOfBirth: p.date_of_birth ?? "",
    address: p.address ?? "",
    ecName: p.ec_name ?? "",
    ecPhone: p.ec_phone ?? "",
    ecRelationship: p.ec_relationship ?? "",
    ecEmail: p.ec_email ?? "",
    medicalIssues: (vp?.medical_issues as string | null) ?? "",
    roles: ((roleRows ?? []) as Array<{ role: string }>)
      .map((r) => r.role)
      .filter((r): r is StaffRole => STAFF_ROLES.includes(r as StaffRole)),
    hasLogin: p.email ? logins.has(String(p.email).toLowerCase()) : false,
  };
}

/** Their roster slots from today on, e.g. "Mon 5 Oct, morning", so removing
 *  someone warns about shifts that will need someone else. */
export async function futureRosterSlots(personId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roster_assignment")
    .select("session:roster_session!inner(date, part)")
    .eq("person_id", personId)
    .gte("session.date", shelterToday());
  return ((data ?? []) as unknown as Array<{ session: { date: string; part: Part } | null }>)
    .map((r) => r.session)
    .filter((s): s is { date: string; part: Part } => s !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.part === b.part ? 0 : a.part === "morning" ? -1 : 1))
    .map(
      (s) =>
        `${parseYmd(s.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}, ${PART_LABEL[s.part].toLowerCase()}`,
    );
}
