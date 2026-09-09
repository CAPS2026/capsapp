"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { approvedEmail } from "@/lib/homecare";

const today = () => new Date().toISOString().slice(0, 10);

export type TokenLookup =
  | { state: "valid"; personName: string; roleLabel: string; firstName: string }
  | { state: "used" | "expired" | "not_found" | "already_active" };

/** Read-only check of an approval token, for the /approve page. */
export async function lookupApprovalToken(token: string): Promise<TokenLookup> {
  const supabase = createAdminClient();
  const { data: tok } = await supabase
    .from("homecare_approval_tokens")
    .select("used_at, expires_at, person_role_id")
    .eq("token", token)
    .maybeSingle();

  if (!tok) return { state: "not_found" };
  if (tok.used_at) return { state: "used" };
  if (new Date(tok.expires_at as string) < new Date()) return { state: "expired" };

  const { data: role } = await supabase
    .from("person_roles")
    .select("role, status, person:people!person_roles_person_id_fkey(first_name, surname)")
    .eq("id", tok.person_role_id)
    .maybeSingle();

  const person = role?.person as unknown as { first_name: string; surname: string } | null;
  if (!role || !person) return { state: "not_found" };
  if (role.status === "active") return { state: "already_active" };

  return {
    state: "valid",
    firstName: person.first_name,
    personName: `${person.first_name} ${person.surname}`,
    roleLabel: role.role === "jailbreak_carer" ? "jail break" : "foster",
  };
}

export type ApproveResult = { ok: true } | { ok?: undefined; error: string };

/** Consume a token and activate the jail break carer role. Public — the
 *  token is the authorisation, no login required. */
export async function approveViaToken(token: string): Promise<ApproveResult> {
  const supabase = createAdminClient();

  const { data: tok } = await supabase
    .from("homecare_approval_tokens")
    .select("used_at, expires_at, person_role_id")
    .eq("token", token)
    .maybeSingle();

  if (!tok) return { error: "This approval link isn't valid." };
  if (tok.used_at) return { error: "This approval link has already been used." };
  if (new Date(tok.expires_at as string) < new Date())
    return { error: "This approval link has expired — approve from the app instead." };

  const { data: role } = await supabase
    .from("person_roles")
    .select("id, role, person:people!person_roles_person_id_fkey(id, first_name, email)")
    .eq("id", tok.person_role_id)
    .maybeSingle();
  const person = role?.person as unknown as { id: string; first_name: string; email: string | null } | null;
  if (!role || !person) return { error: "The application this link points to is gone." };

  const { error: updErr } = await supabase
    .from("person_roles")
    .update({ status: "active", granted_on: today(), note: "Approved via email link" })
    .eq("id", role.id);
  if (updErr) return { error: updErr.message };

  await supabase.from("homecare_approval_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);

  if (person.email) {
    const mail = approvedEmail({ firstName: person.first_name, kind: "jail break" });
    const r = await sendEmail({ to: person.email, subject: mail.subject, text: mail.text });
    if (!r.ok) console.error("approved email failed:", r.error);
  }

  revalidatePath(`/people/${person.id}`);
  revalidatePath("/people");
  return { ok: true };
}

/** Record a foster home visit. Staff only. Sets the yard-check fields and
 *  marks it done — the foster role can then be approved on the person page. */
export async function recordYardCheck(input: {
  personId: string;
  propertyOwnership: string;
  fenceType: string;
  fenceHeight: string;
  peopleAtHome: string;
  childrenU16: string;
  otherAnimals: string;
  animalDetails: string;
  vaccinesCurrent: boolean | null;
  notes: string;
}): Promise<ApproveResult> {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return { error: "Staff only." };

  const supabase = await createClient();
  const toInt = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  const fields = {
    person_id: input.personId,
    property_ownership: input.propertyOwnership.trim() || null,
    fence_type: input.fenceType.trim() || null,
    fence_height: input.fenceHeight.trim() || null,
    people_at_home: toInt(input.peopleAtHome),
    children_u16: toInt(input.childrenU16),
    other_animals: input.otherAnimals.trim() || null,
    animal_details: input.animalDetails.trim() || null,
    vaccines_current: input.vaccinesCurrent,
    yard_check_notes: input.notes.trim() || null,
    yard_check_done: true,
    yard_check_by: me.id,
    yard_check_on: today(),
  };

  // Upsert — a homecare_profile row already exists from registration, but
  // be safe for staff-created records.
  const { error } = await supabase.from("homecare_profile").upsert(fields, { onConflict: "person_id" });
  if (error) return { error: error.message };

  revalidatePath(`/people/${input.personId}`);
  return { ok: true };
}
