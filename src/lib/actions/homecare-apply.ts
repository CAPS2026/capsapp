"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";
import { sendHomecareEmails } from "@/lib/homecare-notify";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Start a jail break and/or foster application for someone who is already
 * on the books (Paul, 2026-10-04) — the "Add jail break / foster carer"
 * choice in a person's Update status menu lands on a form that calls this.
 * Same outcome as ticking the homecare boxes on the public registration
 * form: pending role(s) + a homecare profile + the admin notification (with
 * the one-click jail break approve link) and an acknowledgement to the
 * applicant. Nothing is active until it's approved, and foster still needs a
 * passing home check. Staff only (checked here; writes use the service role
 * because it also touches the approval-token table).
 */
export async function applyForHomecare(input: {
  personId: string;
  jailBreak: boolean;
  foster: boolean;
  propertyOwnership: string;
  fenceType: string;
  fenceHeight: string;
  peopleAtHome: string;
  childrenU16: string;
  otherAnimals: string;
  animalDetails: string;
  vaccinesCurrent: boolean | null;
  jbDay: boolean;
  jbWeekend: boolean;
  jbShift: boolean;
  jbSchool: boolean;
  fosterShort: boolean;
  fosterLong: boolean;
  agreeTerms: boolean;
  signatureName: string;
}): Promise<{ error: string } | { error?: undefined }> {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return { error: "Staff only." };
  if (!input.jailBreak && !input.foster) return { error: "Pick jail break, foster, or both." };
  if (!input.agreeTerms) return { error: "The applicant needs to agree to the terms." };
  if (!input.signatureName.trim()) return { error: "The applicant needs to type their name to sign." };

  const admin = createAdminClient();
  const { data: person } = await admin
    .from("people")
    .select("first_name, surname, email, phone, address, date_of_birth")
    .eq("id", input.personId)
    .maybeSingle();
  if (!person) return { error: "Person not found." };
  if (!person.email) return { error: "Add an email address to their record first — approval is done by email." };

  const { data: existing, error: exErr } = await admin
    .from("person_roles")
    .select("id, role, status")
    .eq("person_id", input.personId)
    .in("role", ["jailbreak_carer", "foster_carer"]);
  if (exErr) return { error: exErr.message };

  const wanted: { role: "jailbreak_carer" | "foster_carer"; label: string }[] = [];
  if (input.jailBreak) wanted.push({ role: "jailbreak_carer", label: "jail break" });
  if (input.foster) wanted.push({ role: "foster_carer", label: "foster" });

  // Refuse before changing anything if either is already held.
  for (const w of wanted) {
    const cur = (existing ?? []).find((r) => r.role === w.role);
    if (cur && (cur.status === "active" || cur.status === "pending")) {
      return { error: `They already have a ${w.label} carer role (${cur.status}).` };
    }
  }

  let jailBreakRoleId: string | null = null;
  let wantsJailBreak = false;
  let wantsFoster = false;
  for (const w of wanted) {
    const cur = (existing ?? []).find((r) => r.role === w.role);
    let roleId: string;
    if (cur) {
      const { error } = await admin.from("person_roles").update({ status: "pending", ended_on: null }).eq("id", cur.id);
      if (error) return { error: error.message };
      roleId = cur.id as string;
    } else {
      const { data: ins, error } = await admin
        .from("person_roles")
        .insert({ person_id: input.personId, role: w.role, status: "pending", granted_on: null })
        .select("id")
        .single();
      if (error || !ins) return { error: error?.message ?? "Couldn't add the role." };
      roleId = ins.id as string;
    }
    if (w.role === "jailbreak_carer") {
      jailBreakRoleId = roleId;
      wantsJailBreak = true;
    } else {
      wantsFoster = true;
    }
  }

  const { data: vp } = await admin
    .from("volunteer_profile")
    .select("experience")
    .eq("person_id", input.personId)
    .maybeSingle();
  const experience = (vp?.experience as string | null | undefined) ?? null;
  const toInt = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  const dob = person.date_of_birth ? new Date(person.date_of_birth as string) : null;
  const over18 = dob ? (Date.now() - dob.getTime()) / (365.25 * 24 * 3_600_000) >= 18 : null;

  const { error: hpErr } = await admin.from("homecare_profile").upsert(
    {
      person_id: input.personId,
      over_18: over18,
      experience,
      property_ownership: input.propertyOwnership.trim() || null,
      fence_type: input.fenceType.trim() || null,
      fence_height: input.fenceHeight.trim() || null,
      people_at_home: toInt(input.peopleAtHome),
      children_u16: toInt(input.childrenU16),
      other_animals: input.otherAnimals.trim() || null,
      animal_details: input.animalDetails.trim() || null,
      vaccines_current: input.vaccinesCurrent,
      jb_day: input.jbDay,
      jb_weekend: input.jbWeekend,
      jb_shift: input.jbShift,
      jb_school: input.jbSchool,
      foster_short: input.fosterShort,
      foster_long: input.fosterLong,
      agree_terms: true,
      signature_name: input.signatureName.trim(),
      signature_date: today(),
      applied_on: today(),
    },
    { onConflict: "person_id" },
  );
  if (hpErr) return { error: hpErr.message };

  await sendHomecareEmails({
    supabase: admin,
    personId: input.personId,
    firstName: person.first_name as string,
    name: `${person.first_name} ${person.surname}`.trim(),
    email: person.email as string,
    phone: (person.phone as string | null) ?? "",
    address: (person.address as string | null) ?? null,
    experience,
    wantsFoster,
    wantsJailBreak,
    jailBreakRoleId,
  });

  revalidatePath("/people");
  revalidatePath(`/people/${input.personId}`);
  return {};
}
