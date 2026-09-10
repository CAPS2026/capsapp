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
  photoUrl: string | null;
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

  const { data } = await supabase
    .from("people")
    .select(
      "id, first_name, surname, nickname, email, phone, date_of_birth, ec_name, ec_phone, auth_user_id, photo_path, updated_at, person_roles!person_roles_person_id_fkey(id, role, status)",
    )
    .order("surname")
    .order("first_name");

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
      photoUrl: personPhotoUrl(p.photo_path, p.updated_at),
    };
  });
}
