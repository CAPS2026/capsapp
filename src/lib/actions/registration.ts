"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  INTEREST_CODES,
  HOW_HEARD_CODES,
  EXPERIENCE_CODES,
  howHeardLabel,
  experienceLabel,
  ageFromDob,
  type RegisterResult,
} from "@/lib/registration";
import { sendEmail } from "@/lib/email";
import type { homePayload } from "@/lib/homecare-form";
import { parentConsentEmail } from "@/lib/consent-email";
import { sendHomecareEmails } from "@/lib/homecare-notify";

// Public, unauthenticated intake. Runs with the service-role client because
// RLS on `people` is staff-only for insert (docs/schema.md §8) and an
// applicant has no session. Nothing here is exposed to the browser.

function clean(s: string | undefined | null): string {
  return (s ?? "").trim();
}

// Digits only, drop a leading 0 or 61 so "0400 123 456" and
// "+61 400 123 456" compare equal. For dedupe matching only.
function normPhone(s: string): string {
  return s.replace(/\D/g, "").replace(/^(?:0|61)/, "");
}

export async function registerVolunteer(input: {
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
  /** Typed full name of the parent/guardian giving consent. */
  parentSignature: string;
  parentalConsent: boolean;
  over18: boolean;
  interests: string[];
  fosterInterest: boolean;
  jailBreakInterest: boolean;
  /** Home / garden details, filled in when a homecare box is ticked. */
  home?: ReturnType<typeof homePayload>;
  experienceLevel: string;
  experienceOther: string;
  medicalIssues: string;
  howHeard: string;
  howHeardOther: string;
  imageConsent: boolean | null;
  agreeTerms: boolean;
  signatureName: string;
  /** Honeypot — real users never see or fill this. */
  website: string;
}): Promise<RegisterResult> {
  // Bot filled the hidden field: look successful, write nothing.
  if (clean(input.website)) return { ok: true, status: "active" };

  const firstName = clean(input.firstName);
  const surname = clean(input.surname);
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone);
  const phoneDigits = phone.replace(/\D/g, "");
  const dob = clean(input.dateOfBirth);
  const interests = input.interests.filter((i) => INTEREST_CODES.has(i));
  const howHeardCode = HOW_HEARD_CODES.has(input.howHeard) ? input.howHeard : "";
  const experienceCode = EXPERIENCE_CODES.has(input.experienceLevel) ? input.experienceLevel : "";
  const wantsHomecare = input.fosterInterest || input.jailBreakInterest;

  if (!firstName || !surname) return { error: "Please give your first name and surname." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Please give a valid email address." };
  if (!phone) return { error: "Please give a phone number." };
  if (phoneDigits.length < 8 || phoneDigits.length > 15)
    return { error: "That phone number doesn't look right — please check it." };
  if (!dob || ageFromDob(dob) === null) return { error: "Please give your date of birth." };
  if (!clean(input.ecName) || !clean(input.ecPhone))
    return { error: "Please give an emergency contact name and phone number." };
  if (!experienceCode) return { error: "Please pick the option that best describes your experience." };
  if (experienceCode === "other" && !clean(input.experienceOther))
    return { error: "Please describe your experience." };
  if (interests.length === 0 && !wantsHomecare)
    return { error: "Pick at least one thing you'd like to help with." };
  if (input.imageConsent === null)
    return { error: "Please answer the promotional-image consent question." };
  if (!input.agreeTerms) return { error: "Please agree to the volunteer terms to continue." };
  if (!clean(input.signatureName)) return { error: "Please type your name to sign." };

  const dobAge = ageFromDob(dob)!;
  // Gate on either signal — the explicit "18 or over" answer or the date
  // of birth. If they conflict, treat as a minor (safer).
  const minor = !input.over18 || dobAge < 18;
  if (minor) {
    if (!clean(input.parentName) || !clean(input.parentPhone))
      return {
        error: "Because you're under 18, please give a parent or guardian's name and phone number.",
      };
    if (!clean(input.parentEmail) || !/^[^@s]+@[^@s]+.[^@s]+$/.test(clean(input.parentEmail)))
      return { error: "Please give the parent or guardian's email address — we send them a copy of their consent." };
    if (!clean(input.parentSignature))
      return { error: "The parent or guardian needs to type their full name to give consent." };
    if (!input.parentalConsent)
      return {
        error: "A parent or guardian needs to tick the consent box for an under-18 to volunteer.",
      };
  }

  const supabase = createAdminClient();

  // Dedupe — never silently create a second record for someone CAPS
  // already knows. Match on email, normalised phone, or exact name.
  const { data: existing } = await supabase.from("people").select("email, phone, first_name, surname");
  const nPhone = normPhone(phone);
  const duplicate = (existing ?? []).some(
    (p) =>
      (p.email && p.email.toLowerCase() === email) ||
      (nPhone.length >= 6 && p.phone && normPhone(p.phone) === nPhone) ||
      (p.first_name?.toLowerCase() === firstName.toLowerCase() &&
        p.surname?.toLowerCase() === surname.toLowerCase()),
  );
  if (duplicate) {
    return {
      error:
        "It looks like you're already registered with CAPS. Please contact the shelter if you need to update your details.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const personFields: Record<string, unknown> = {
    first_name: firstName,
    surname,
    nickname: clean(input.nickname) || null,
    email,
    phone,
    date_of_birth: dob,
    address: clean(input.address) || null,
    ec_name: clean(input.ecName),
    ec_phone: clean(input.ecPhone),
    ec_relationship: clean(input.ecRelationship) || null,
    ec_email: clean(input.ecEmail) || null,
    parent_name: minor ? clean(input.parentName) : null,
    parent_phone: minor ? clean(input.parentPhone) : null,
    parent_email: minor ? clean(input.parentEmail) || null : null,
    parental_consent: minor,
    parental_consent_date: minor ? today : null,
    parent_signature_name: minor ? clean(input.parentSignature) : null,
    image_consent: input.imageConsent,
  };

  let personRes = await supabase.from("people").insert(personFields).select("id").single();

  // 42703 = undefined column — the image_consent migration (10) hasn't
  // been applied yet. Retry without it so registration still works.
  if (personRes.error?.code === "42703") {
    delete personFields.image_consent;
    delete personFields.parent_signature_name;
    personRes = await supabase.from("people").insert(personFields).select("id").single();
  }

  const { data: personRow, error: personErr } = personRes;

  if (personErr || !personRow) {
    // 23505 = unique violation — almost certainly the email, i.e. a
    // near-simultaneous duplicate the pre-check above didn't catch.
    if (personErr?.code === "23505") {
      return {
        error:
          "It looks like you're already registered with CAPS. Please contact the shelter if you need to update your details.",
      };
    }
    return { error: personErr?.message ?? "Something went wrong saving your registration." };
  }

  const experienceText = experienceLabel(experienceCode || null, input.experienceOther);
  const signature = clean(input.signatureName);

  const { error: profileErr } = await supabase.from("volunteer_profile").insert({
    person_id: personRow.id,
    interests,
    experience: experienceText,
    medical_issues: clean(input.medicalIssues) || null,
    how_heard: howHeardLabel(howHeardCode || null, input.howHeardOther) || null,
    agree_terms: true,
    signature_name: signature,
    signature_date: today,
  });
  if (profileErr) return { error: profileErr.message };

  // Roles. On-site help → a `volunteer` role (under-18s land pending — a
  // staff member confirms parent/guardian consent first, hard gate, Paul
  // 2026-09-09; adults active immediately). Homecare → pending
  // `foster_carer` / `jailbreak_carer` roles that stay pending until the
  // email approval / home-visit flow clears them.
  const roleRows: { person_id: string; role: string; status: string; granted_on: string | null }[] = [];
  if (interests.length > 0) {
    const status: "active" | "pending" = minor ? "pending" : "active";
    roleRows.push({
      person_id: personRow.id,
      role: "volunteer",
      status,
      granted_on: status === "active" ? today : null,
    });
  }
  if (input.fosterInterest)
    roleRows.push({ person_id: personRow.id, role: "foster_carer", status: "pending", granted_on: null });
  if (input.jailBreakInterest)
    roleRows.push({ person_id: personRow.id, role: "jailbreak_carer", status: "pending", granted_on: null });

  const { data: insertedRoles, error: roleErr } = await supabase
    .from("person_roles")
    .insert(roleRows)
    .select("id, role");
  if (roleErr) return { error: roleErr.message };

  if (wantsHomecare) {
    const { error: hpErr } = await supabase.from("homecare_profile").insert({
      person_id: personRow.id,
      over_18: input.over18,
      experience: experienceText,
      ...(input.home
        ? {
            property_ownership: clean(input.home.propertyOwnership) || null,
            fence_type: clean(input.home.fenceType) || null,
            fence_height: clean(input.home.fenceHeight) || null,
            people_at_home: Number.isFinite(parseInt(input.home.peopleAtHome, 10)) ? parseInt(input.home.peopleAtHome, 10) : null,
            children_u16: Number.isFinite(parseInt(input.home.childrenU16, 10)) ? parseInt(input.home.childrenU16, 10) : null,
            other_animals: clean(input.home.otherAnimals) || null,
            animal_details: clean(input.home.animalDetails) || null,
            vaccines_current: input.home.vaccinesCurrent,
            jb_day: input.home.jbDay,
            jb_weekend: input.home.jbWeekend,
            jb_shift: input.home.jbShift,
            jb_school: input.home.jbSchool,
            foster_short: input.home.fosterShort,
            foster_long: input.home.fosterLong,
          }
        : {}),
      agree_terms: true,
      signature_name: signature,
      signature_date: today,
      applied_on: today,
    });
    if (hpErr) console.error("homecare_profile insert failed for", personRow.id, hpErr);
    // Fire-and-log the notification + acknowledgement emails. Never fail
    // the registration over an email problem.
    await sendHomecareEmails({
      supabase,
      personId: personRow.id,
      firstName,
      name: `${firstName} ${surname}`,
      email,
      phone,
      address: clean(input.address) || null,
      experience: experienceText,
      wantsFoster: input.fosterInterest,
      wantsJailBreak: input.jailBreakInterest,
      jailBreakRoleId:
        (insertedRoles ?? []).find((r) => r.role === "jailbreak_carer")?.id ?? null,
    });
  }

  // Under-18: confirm to the parent/guardian what they've agreed to.
  // Best-effort, never fails the registration.
  if (minor) {
    try {
      const mail = parentConsentEmail({
        parentName: clean(input.parentName),
        parentSignature: clean(input.parentSignature),
        parentPhone: clean(input.parentPhone),
        childName: `${firstName} ${surname}`,
        childDob: dob,
        activities: interests,
        wantsFoster: input.fosterInterest,
        wantsJailBreak: input.jailBreakInterest,
        imageConsent: input.imageConsent,
        signedOn: today,
      });
      const r = await sendEmail({ to: clean(input.parentEmail), subject: mail.subject, text: mail.text, html: mail.html });
      if (!r.ok) console.error("parent consent email failed:", r.error);
    } catch (e) {
      console.error("parent consent email threw:", e);
    }
  }

  return { ok: true, status: minor ? "pending" : "active" };
}
