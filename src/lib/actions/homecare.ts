"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { approvedEmail, improvementsEmail } from "@/lib/homecare";

const today = () => new Date().toISOString().slice(0, 10);

export type TokenLookup =
  | {
      state: "valid";
      firstName: string;
      personName: string;
      roleLabel: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      experience: string | null;
    }
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
    .select(
      "role, status, person:people!person_roles_person_id_fkey(id, first_name, surname, email, phone, address)",
    )
    .eq("id", tok.person_role_id)
    .maybeSingle();

  const person = role?.person as unknown as {
    id: string;
    first_name: string;
    surname: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  if (!role || !person) return { state: "not_found" };
  if (role.status === "active") return { state: "already_active" };

  const { data: vp } = await supabase
    .from("volunteer_profile")
    .select("experience")
    .eq("person_id", person.id)
    .maybeSingle();

  return {
    state: "valid",
    firstName: person.first_name,
    personName: `${person.first_name} ${person.surname}`,
    roleLabel: role.role === "jailbreak_carer" ? "jail break" : "foster",
    email: person.email,
    phone: person.phone,
    address: person.address,
    experience: (vp?.experience as string | null) ?? null,
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
    .select("id, role, status, person:people!person_roles_person_id_fkey(id, first_name, email)")
    .eq("id", tok.person_role_id)
    .maybeSingle();
  const person = role?.person as unknown as { id: string; first_name: string; email: string | null } | null;
  if (!role || !person) return { error: "The application this link points to is gone." };
  // Email links only ever approve jail break — foster must go through the
  // in-app home check. Anything else here means a bad or stale token.
  if (role.role !== "jailbreak_carer")
    return { error: "This link can't approve that role — do it from the app." };
  if (role.status === "active") return { error: "This carer is already approved." };

  // Consume the token atomically first — if a second click (or a mail
  // scanner) already used it, this updates 0 rows and we stop.
  const { data: claimed } = await supabase
    .from("homecare_approval_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null)
    .select("token");
  if (!claimed || claimed.length === 0)
    return { error: "This approval link has already been used." };

  const { error: updErr } = await supabase
    .from("person_roles")
    .update({ status: "active", granted_on: today(), note: "Approved via email link" })
    .eq("id", role.id);
  if (updErr) return { error: updErr.message };

  if (person.email) {
    const mail = approvedEmail({ firstName: person.first_name, kind: "jail break" });
    const r = await sendEmail({ to: person.email, subject: mail.subject, text: mail.text, html: mail.html });
    if (!r.ok) console.error("approved email failed:", r.error);
  }

  revalidatePath(`/people/${person.id}`);
  revalidatePath("/people");
  return { ok: true };
}

/** Record a foster home visit. Staff only. Two outcomes:
 *  - "passed": sets yard_check_done, the foster role can then be approved.
 *  - "improvements_needed": leaves it not-done and optionally emails the
 *    applicant the (staff-edited) list of what to sort first. */
export async function recordHomeCheck(input: {
  personId: string;
  outcome: "passed" | "improvements_needed";
  propertyOwnership: string;
  fenceType: string;
  fenceHeight: string;
  peopleAtHome: string;
  childrenU16: string;
  otherAnimals: string;
  animalDetails: string;
  vaccinesCurrent: boolean | null;
  notes: string;
  /** Only for improvements_needed — the edited email body. Omit / empty to
   *  record without emailing. */
  emailBody?: string;
}): Promise<ApproveResult> {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return { error: "Staff only." };

  const supabase = await createClient();
  const toInt = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  const passed = input.outcome === "passed";

  const fields: Record<string, unknown> = {
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
    yard_check_outcome: input.outcome,
    yard_check_done: passed,
    yard_check_by: me.id,
    yard_check_on: today(),
  };

  let res = await supabase.from("homecare_profile").upsert(fields, { onConflict: "person_id" });
  // 42703 = migration 12 (yard_check_outcome) not applied yet — retry without it.
  if (res.error?.code === "42703") {
    delete fields.yard_check_outcome;
    res = await supabase.from("homecare_profile").upsert(fields, { onConflict: "person_id" });
  }
  if (res.error) return { error: res.error.message };

  if (!passed && input.emailBody?.trim()) {
    const { data: person } = await supabase
      .from("people")
      .select("email")
      .eq("id", input.personId)
      .maybeSingle();
    if (person?.email) {
      const mail = improvementsEmail(input.emailBody.trim());
      const r = await sendEmail({
        to: person.email as string,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      if (!r.ok) return { error: `Home check saved, but the email failed to send: ${r.error}` };
    }
  }

  revalidatePath(`/people/${input.personId}`);
  return { ok: true };
}
