import { createClient } from "@/lib/supabase/server";
import { ageFromDob } from "@/lib/people-data";
import type { Role } from "@/lib/auth";

export type PersonRoleDetail = {
  id: string;
  role: Role;
  status: "pending" | "active" | "exited" | "declined";
  grantedOn: string | null;
  endedOn: string | null;
  note: string | null;
  approverName: string | null;
};

export type PersonDetail = {
  id: string;
  firstName: string;
  surname: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  age: number | null;
  isMinor: boolean;
  address: string | null;
  hasAccount: boolean;
  ec: { name: string | null; phone: string | null; relationship: string | null; email: string | null };
  parent: {
    name: string | null;
    phone: string | null;
    email: string | null;
    consent: boolean;
    consentDate: string | null;
  };
  notesInternal: string | null;
  createdAt: string;
  roles: PersonRoleDetail[];
  volunteerProfile: {
    interests: string[];
    experience: string | null;
    medicalIssues: string | null;
    howHeard: string | null;
    signatureName: string | null;
    signatureDate: string | null;
  } | null;
  homecareProfile: Record<string, unknown> | null;
};

export async function getPersonDetail(id: string): Promise<PersonDetail | null> {
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("people")
    .select(
      "*, person_roles!person_roles_person_id_fkey(id, role, status, granted_on, ended_on, note, approved_by)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!p) return null;

  const row = p as unknown as {
    id: string;
    first_name: string;
    surname: string;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    address: string | null;
    auth_user_id: string | null;
    ec_name: string | null;
    ec_phone: string | null;
    ec_relationship: string | null;
    ec_email: string | null;
    parent_name: string | null;
    parent_phone: string | null;
    parent_email: string | null;
    parental_consent: boolean;
    parental_consent_date: string | null;
    notes_internal: string | null;
    created_at: string;
    person_roles:
      | Array<{
          id: string;
          role: Role;
          status: PersonRoleDetail["status"];
          granted_on: string | null;
          ended_on: string | null;
          note: string | null;
          approved_by: string | null;
        }>
      | null;
  };

  const { data: vp } = await supabase
    .from("volunteer_profile")
    .select("interests, experience, medical_issues, how_heard, signature_name, signature_date")
    .eq("person_id", id)
    .maybeSingle();

  const { data: hp } = await supabase
    .from("homecare_profile")
    .select("*")
    .eq("person_id", id)
    .maybeSingle();

  const age = ageFromDob(row.date_of_birth);

  return {
    id: row.id,
    firstName: row.first_name,
    surname: row.surname,
    nickname: row.nickname,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    age,
    isMinor: age !== null && age < 18,
    address: row.address,
    hasAccount: !!row.auth_user_id,
    ec: {
      name: row.ec_name,
      phone: row.ec_phone,
      relationship: row.ec_relationship,
      email: row.ec_email,
    },
    parent: {
      name: row.parent_name,
      phone: row.parent_phone,
      email: row.parent_email,
      consent: row.parental_consent,
      consentDate: row.parental_consent_date,
    },
    notesInternal: row.notes_internal,
    createdAt: row.created_at,
    roles: (row.person_roles ?? [])
      .slice()
      .sort((a, b) => a.role.localeCompare(b.role))
      .map((r) => ({
        id: r.id,
        role: r.role,
        status: r.status,
        grantedOn: r.granted_on,
        endedOn: r.ended_on,
        note: r.note,
        approverName: null,
      })),
    volunteerProfile: vp
      ? {
          interests: (vp.interests as string[] | null) ?? [],
          experience: vp.experience,
          medicalIssues: vp.medical_issues,
          howHeard: vp.how_heard,
          signatureName: vp.signature_name,
          signatureDate: vp.signature_date,
        }
      : null,
    homecareProfile: (hp as Record<string, unknown> | null) ?? null,
  };
}
