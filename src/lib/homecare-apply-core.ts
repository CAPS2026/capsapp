// The shared heart of a homecare (jail break / foster) application for
// someone who already has a people row: pending role(s), the homecare
// profile, and the approval emails. Used by the staff form and the public
// homecare form. NOT a "use server" file — it takes a service-role client and
// must never be callable from the browser; each caller does its own checks.
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHomecareEmails } from "@/lib/homecare-notify";

const today = () => new Date().toISOString().slice(0, 10);

export type HomecareApplicationInput = {
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
};

export async function submitHomecareApplication(
  admin: ReturnType<typeof createAdminClient>,
  personId: string,
  input: HomecareApplicationInput,
  /** Public form: never overwrite home details we already hold, only fill gaps. */
  opts: { fillBlanksOnly: boolean },
): Promise<{ error: string } | { error?: undefined }> {
  if (!input.jailBreak && !input.foster) return { error: "Pick jail break, foster, or both." };
  if (!input.agreeTerms) return { error: "Please agree to the terms." };
  if (!input.signatureName.trim()) return { error: "Please type your name to sign." };

  const { data: person } = await admin
    .from("people")
    .select("first_name, surname, email, phone, address, date_of_birth")
    .eq("id", personId)
    .maybeSingle();
  if (!person) return { error: "Person not found." };
  if (!person.email) return { error: "Add an email address to their record first — approval is done by email." };

  const { data: existing, error: exErr } = await admin
    .from("person_roles")
    .select("id, role, status")
    .eq("person_id", personId)
    .in("role", ["jailbreak_carer", "foster_carer"]);
  if (exErr) return { error: exErr.message };

  const wanted: { role: "jailbreak_carer" | "foster_carer"; label: string }[] = [];
  if (input.jailBreak) wanted.push({ role: "jailbreak_carer", label: "jail break" });
  if (input.foster) wanted.push({ role: "foster_carer", label: "foster" });

  // Refuse before changing anything if either is already held.
  for (const w of wanted) {
    const cur = (existing ?? []).find((r) => r.role === w.role);
    if (cur && (cur.status === "active" || cur.status === "pending")) {
      return { error: `There's already a ${w.label} carer ${cur.status === "active" ? "approval" : "application"} on file.` };
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
        .insert({ person_id: personId, role: w.role, status: "pending", granted_on: null })
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

  const [{ data: vp }, { data: oldHp }] = await Promise.all([
    admin.from("volunteer_profile").select("experience").eq("person_id", personId).maybeSingle(),
    admin.from("homecare_profile").select("*").eq("person_id", personId).maybeSingle(),
  ]);
  const experience = (vp?.experience as string | null | undefined) ?? null;
  const toInt = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  const dob = person.date_of_birth ? new Date(person.date_of_birth as string) : null;
  const over18 = dob ? (Date.now() - dob.getTime()) / (365.25 * 24 * 3_600_000) >= 18 : null;

  const fresh: Record<string, unknown> = {
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
  };
  // Public form: keep anything already on file (someone could submit it for
  // another person's email), only fill what's blank.
  const merged: Record<string, unknown> = { ...fresh };
  if (opts.fillBlanksOnly && oldHp) {
    for (const [k, v] of Object.entries(fresh)) {
      const old = (oldHp as Record<string, unknown>)[k];
      if (old !== null && old !== undefined && old !== "") merged[k] = old;
    }
  }

  const { error: hpErr } = await admin.from("homecare_profile").upsert(
    {
      person_id: personId,
      over_18: over18,
      experience,
      ...merged,
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
    personId,
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

  return {};
}
