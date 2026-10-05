import { createClient } from "@/lib/supabase/server";
import { personPhotoUrl } from "@/lib/people";
import type { Role } from "@/lib/auth";

export type RoleRow = {
  id: string;
  role: Role;
  status: "pending" | "active" | "exited" | "declined";
};

export type PersonListItem = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  roles: RoleRow[];
  hasAccount: boolean;
  isMinor: boolean;
  hasPending: boolean;
  archived: boolean;
  missingEmergencyContact: boolean;
  /** They explicitly said no to promotional-image use. */
  noImageConsent: boolean;
  photoUrl: string | null;
  /** Walk stats, same idea as the Dogs list: only meaningful for walkers. */
  lastWalkAt: string | null;
  /** Minutes walked in the trailing 28 days (completed walks). */
  fourWeekWalkMinutes: number;
};

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export async function getPeopleList(): Promise<PersonListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, first_name, surname, nickname, email, phone, date_of_birth, ec_name, ec_phone, auth_user_id, image_consent, photo_path, updated_at, person_roles!person_roles_person_id_fkey(id, role, status)",
    )
    .order("surname")
    .order("first_name");
  if (error) console.error("getPeopleList failed", error);

  // Walk stats per person (all walks, newest data wins for "last walk").
  const { data: walkRows, error: walkErr } = await supabase
    .from("dog_activity")
    .select("person_id, started_at, ended_at")
    .eq("type", "walk")
    .not("person_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(10000);
  if (walkErr) console.error("getPeopleList walk stats failed", walkErr);
  const since = Date.now() - 28 * 24 * 3_600_000;
  const walkStats = new Map<string, { last: string; minutes: number }>();
  for (const w of (walkRows ?? []) as Array<{ person_id: string; started_at: string; ended_at: string | null }>) {
    const cur = walkStats.get(w.person_id) ?? { last: w.ended_at ?? w.started_at, minutes: 0 };
    if (w.ended_at && new Date(w.started_at).getTime() >= since) {
      cur.minutes += Math.max(0, Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60_000));
    }
    walkStats.set(w.person_id, cur);
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    first_name: string;
    surname: string;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    ec_name: string | null;
    ec_phone: string | null;
    auth_user_id: string | null;
    image_consent: boolean | null;
    photo_path: string | null;
    updated_at: string | null;
    person_roles: RoleRow[] | null;
  }>).map((p) => {
    const roles = p.person_roles ?? [];
    const active = roles.filter((r) => r.status === "active");
    const age = ageFromDob(p.date_of_birth);
    return {
      id: p.id,
      name: `${p.first_name} ${p.surname}`.trim(),
      nickname: p.nickname,
      email: p.email,
      phone: p.phone,
      roles,
      hasAccount: !!p.auth_user_id,
      isMinor: age !== null && age < 18,
      hasPending: roles.some((r) => r.status === "pending"),
      // No dedicated archive column yet — "archived" means every role has
      // been ended (exited/declined) and none is live.
      archived: roles.length > 0 && !roles.some((r) => r.status === "active" || r.status === "pending"),
      missingEmergencyContact: active.some((r) => r.role === "volunteer") && (!p.ec_name || !p.ec_phone),
      noImageConsent: p.image_consent === false,
      photoUrl: personPhotoUrl(p.photo_path, p.updated_at),
      lastWalkAt: walkStats.get(p.id)?.last ?? null,
      fourWeekWalkMinutes: walkStats.get(p.id)?.minutes ?? 0,
    };
  });
}

export type MergeCandidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  hasAccount: boolean;
  roleSummary: string;
};

/** Everyone except `excludeId`, as a slim list for the "merge duplicate"
 *  picker on the person page. */
export async function getMergeCandidates(excludeId: string): Promise<MergeCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select(
      "id, first_name, surname, email, phone, auth_user_id, person_roles!person_roles_person_id_fkey(role, status)",
    )
    .neq("id", excludeId)
    .order("surname")
    .order("first_name");
  if (error) console.error("getMergeCandidates failed", error);

  return ((data ?? []) as unknown as Array<{
    id: string;
    first_name: string;
    surname: string;
    email: string | null;
    phone: string | null;
    auth_user_id: string | null;
    person_roles: { role: Role; status: string }[] | null;
  }>).map((p) => {
    const live = (p.person_roles ?? []).filter(
      (r) => r.status === "active" || r.status === "pending",
    );
    return {
      id: p.id,
      name: `${p.first_name} ${p.surname}`.trim(),
      email: p.email,
      phone: p.phone,
      hasAccount: !!p.auth_user_id,
      roleSummary: live.map((r) => `${r.role.replace(/_/g, " ")} (${r.status})`).join(", ") || "no roles",
    };
  });
}

export type PendingApproval = {
  roleId: string;
  personId: string;
  personName: string;
  role: Role;
  /** When they applied (homecare application date, else the record's created date). */
  appliedOn: string | null;
  isMinor: boolean;
  /** Set when Approve can't be used yet, with where to go to fix it. */
  blockedReason?: string;
  blockedHref?: string;
};

/** Everything waiting on an approval, oldest first — the People page's
 *  Approvals list. Foster is blocked until a home check has passed. */
export async function getPendingApprovals(): Promise<PendingApproval[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_roles")
    .select(
      "id, role, status, person:people!person_roles_person_id_fkey(id, first_name, surname, nickname, date_of_birth, created_at)",
    )
    .eq("status", "pending");
  if (error) console.error("getPendingApprovals failed", error);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    role: Role;
    person: {
      id: string;
      first_name: string;
      surname: string;
      nickname: string | null;
      date_of_birth: string | null;
      created_at: string | null;
    } | null;
  }>;
  const ids = [...new Set(rows.filter((r) => r.person).map((r) => r.person!.id))];
  const { data: hps, error: hpErr } = ids.length
    ? await supabase
        .from("homecare_profile")
        .select("person_id, applied_on, yard_check_done, yard_check_outcome")
        .in("person_id", ids)
    : { data: [], error: null };
  if (hpErr) console.error("getPendingApprovals homecare_profile failed", hpErr);
  const hpBy = new Map(
    ((hps ?? []) as Array<{ person_id: string; applied_on: string | null; yard_check_done: boolean | null; yard_check_outcome: string | null }>).map(
      (h) => [h.person_id, h],
    ),
  );

  return rows
    .filter((r) => r.person)
    .map((r) => {
      const p = r.person!;
      const hp = hpBy.get(p.id);
      const age = ageFromDob(p.date_of_birth);
      const out: PendingApproval = {
        roleId: r.id,
        personId: p.id,
        personName: p.nickname ? `${p.nickname} (${p.first_name} ${p.surname})` : `${p.first_name} ${p.surname}`.trim(),
        role: r.role,
        appliedOn: hp?.applied_on ?? p.created_at,
        isMinor: age !== null && age < 18,
      };
      if (r.role === "foster_carer" && !hp?.yard_check_done) {
        out.blockedReason =
          hp?.yard_check_outcome === "improvements_needed" ? "Home check found improvements needed." : "Needs a home check first.";
        out.blockedHref = `/people/${p.id}/home-check`;
      }
      return out;
    })
    .sort((a, b) => (a.appliedOn ?? "").localeCompare(b.appliedOn ?? ""));
}
