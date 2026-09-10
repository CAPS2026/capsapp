"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";

type Result = { error: string } | { error?: undefined };

const today = () => new Date().toISOString().slice(0, 10);

async function requireStaff() {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return null;
  return me;
}

async function requireAdmin() {
  const me = await getCurrentPerson();
  if (!me?.isAdmin || !me.id) return null;
  return me;
}

function revalidate(personId: string) {
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}

/** Move a pending role to active (docs/ui-flows.md §8 — approve). */
export async function approveRole(personRoleId: string, personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();

  const { data: roleRow } = await supabase
    .from("person_roles")
    .select("role, status")
    .eq("id", personRoleId)
    .maybeSingle();
  if (!roleRow || roleRow.status !== "pending") return { error: "That role isn't pending." };

  // Foster needs the home visit recorded first (Paul, 2026-09-09).
  if (roleRow.role === "foster_carer") {
    const { data: hp } = await supabase
      .from("homecare_profile")
      .select("yard_check_done")
      .eq("person_id", personId)
      .maybeSingle();
    if (!hp?.yard_check_done)
      return { error: "Record a passing home check before approving a foster carer." };
  }

  const { error } = await supabase
    .from("person_roles")
    .update({ status: "active", approved_by: me.id, granted_on: today() })
    .eq("id", personRoleId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidate(personId);
  return {};
}

export async function declineRole(personRoleId: string, personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("person_roles")
    .update({ status: "declined", approved_by: me.id, ended_on: today() })
    .eq("id", personRoleId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidate(personId);
  return {};
}

/**
 * No dedicated archive column yet — "archive" just ends every live role so
 * the person drops off the rosters and pickers. Restore brings the
 * volunteer role back active; carer roles come back as pending so they
 * re-run approval.
 */
export async function archivePerson(personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("person_roles")
    .update({ status: "exited", ended_on: today() })
    .eq("person_id", personId)
    .in("status", ["active", "pending"]);

  if (error) return { error: error.message };
  revalidate(personId);
  return {};
}

export async function restorePerson(personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();

  const { error: volErr } = await supabase
    .from("person_roles")
    .update({ status: "active", granted_on: today(), ended_on: null })
    .eq("person_id", personId)
    .eq("status", "exited")
    .eq("role", "volunteer");
  if (volErr) return { error: volErr.message };

  const { error: carerErr } = await supabase
    .from("person_roles")
    .update({ status: "pending", ended_on: null })
    .eq("person_id", personId)
    .eq("status", "exited")
    .in("role", ["jailbreak_carer", "foster_carer"]);
  if (carerErr) return { error: carerErr.message };

  revalidate(personId);
  return {};
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Staff edit of a person's core details (docs/ui-flows.md §8). */
export async function updatePerson(
  personId: string,
  input: {
    firstName: string;
    surname: string;
    nickname: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    ecName: string;
    ecPhone: string;
    ecRelationship: string;
    ecEmail: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    parentalConsent: boolean;
    imageConsent: boolean | null;
    notesInternal: string;
  },
): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const firstName = input.firstName.trim();
  const surname = input.surname.trim();
  if (!firstName || !surname) return { error: "First name and surname are required." };

  const email = input.email.trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };
  const phone = input.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone && (phoneDigits.length < 8 || phoneDigits.length > 15))
    return { error: "That phone number doesn't look right." };
  const ecEmail = input.ecEmail.trim().toLowerCase();
  if (ecEmail && !EMAIL_RE.test(ecEmail)) return { error: "The emergency contact email doesn't look right." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("people")
    .update({
      first_name: firstName,
      surname,
      nickname: input.nickname.trim() || null,
      email: email || null,
      phone: phone || null,
      date_of_birth: input.dateOfBirth || null,
      address: input.address.trim() || null,
      ec_name: input.ecName.trim() || null,
      ec_phone: input.ecPhone.trim() || null,
      ec_relationship: input.ecRelationship.trim() || null,
      ec_email: ecEmail || null,
      parent_name: input.parentName.trim() || null,
      parent_phone: input.parentPhone.trim() || null,
      parent_email: input.parentEmail.trim() || null,
      parental_consent: input.parentalConsent,
      image_consent: input.imageConsent,
      notes_internal: input.notesInternal.trim() || null,
    })
    .eq("id", personId);

  if (error) {
    if (error.code === "23505") return { error: "Another person already has that email address." };
    return { error: error.message };
  }
  revalidate(personId);
  return {};
}

/**
 * Grant or remove the Volunteer Plus role (staff only). Volunteer Plus
 * volunteers sign in themselves and can operate kiosk mode for walks +
 * yard. They need an email on file to sign in.
 */
export async function setVolunteerPlus(personId: string, on: boolean): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };

  const supabase = await createClient();

  if (on) {
    const { data: person } = await supabase.from("people").select("email").eq("id", personId).maybeSingle();
    if (!person?.email)
      return { error: "Add an email address first — Volunteer Plus volunteers sign in with it." };

    const { error } = await supabase
      .from("person_roles")
      .upsert(
        {
          person_id: personId,
          role: "volunteer_plus",
          status: "active",
          approved_by: me.id,
          granted_on: today(),
          ended_on: null,
        },
        { onConflict: "person_id,role" },
      );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("person_roles")
      .update({ status: "exited", ended_on: today() })
      .eq("person_id", personId)
      .eq("role", "volunteer_plus");
    if (error) return { error: error.message };
  }

  revalidate(personId);
  return {};
}

/**
 * Fold a duplicate person record into another (dedupe part c). Everything
 * the removed record owns moves to the kept one, blanks on the kept record
 * are filled in from the removed one, then the removed record is deleted —
 * all in one DB transaction (the `merge_people` function). Staff only, no
 * undo.
 */
export async function mergePeople(keepId: string, removeId: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  if (keepId === removeId) return { error: "Pick two different records." };
  if (removeId === me.id)
    return { error: "That would delete your own record — keep yours and remove the other one." };

  const admin = createAdminClient();
  const { error } = await admin.rpc("merge_people", { p_keep: keepId, p_remove: removeId });
  if (error) return { error: error.message };

  revalidatePath("/people");
  revalidatePath(`/people/${keepId}`);
  return {};
}

/**
 * Permanently delete a person and everything that belongs to them (roles,
 * profiles, their own activity + site-visit rows). Where they appear as an
 * operator / author / approver on someone else's record, their name is
 * cleared but the record is kept. Staff only, no undo.
 */
export async function deletePerson(personId: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { error: "Admin only." };
  if (me.id === personId) return { error: "You can't delete your own record." };

  const admin = createAdminClient();

  // Null out references on other people's / dogs' records (these FKs block
  // a delete otherwise).
  await admin.from("person_roles").update({ approved_by: null }).eq("approved_by", personId);
  await admin.from("dog_activity").update({ placed_by: null }).eq("placed_by", personId);
  await admin.from("dog_activity").update({ edited_by: null }).eq("edited_by", personId);
  await admin.from("medical_events").update({ created_by: null }).eq("created_by", personId);
  await admin.from("notes").update({ author_id: null }).eq("author_id", personId);
  await admin.from("homecare_profile").update({ yard_check_by: null }).eq("yard_check_by", personId);

  // Delete rows that are theirs.
  await admin.from("dog_activity").delete().eq("person_id", personId);
  await admin.from("site_visits").delete().eq("person_id", personId);
  await admin.from("notes").delete().eq("subject_type", "person").eq("subject_id", personId);

  // person_roles / homecare_profile / volunteer_profile cascade.
  const { error } = await admin.from("people").delete().eq("id", personId);
  if (error) return { error: error.message };

  revalidatePath("/people");
  return {};
}
