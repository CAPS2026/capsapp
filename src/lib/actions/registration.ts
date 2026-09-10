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
import { sendEmail, siteUrl } from "@/lib/email";
import { DEFAULT_ADMIN_EMAIL, adminNotificationEmail, applicantAckEmail } from "@/lib/homecare";

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
  parentalConsent: boolean;
  over18: boolean;
  interests: string[];
  fosterInterest: boolean;
  jailBreakInterest: boolean;
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
    image_consent: input.imageConsent,
  };

  let personRes = await supabase.from("people").insert(personFields).select("id").single();

  // 42703 = undefined column — the image_consent migration (10) hasn't
  // been applied yet. Retry without it so registration still works.
  if (personRes.error?.code === "42703") {
    delete personFields.image_consent;
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

  return { ok: true, status: minor ? "pending" : "active" };
}

async function sendHomecareEmails(opts: {
  supabase: ReturnType<typeof createAdminClient>;
  personId: string;
  firstName: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  experience: string | null;
  wantsFoster: boolean;
  wantsJailBreak: boolean;
  jailBreakRoleId: string | null;
}) {
  try {
    const { data: settings } = await opts.supabase
      .from("org_settings")
      .select("admin_notification_email")
      .maybeSingle();
    const adminEmail =
      (settings?.admin_notification_email as string | undefined)?.trim() || DEFAULT_ADMIN_EMAIL;

    let jailBreakApproveUrl: string | null = null;
    if (opts.wantsJailBreak && opts.jailBreakRoleId) {
      const { data: tok } = await opts.supabase
        .from("homecare_approval_tokens")
        .insert({ person_role_id: opts.jailBreakRoleId })
        .select("token")
        .single();
      if (tok?.token) jailBreakApproveUrl = `${siteUrl()}/approve/${tok.token}`;
    }

    const admin = adminNotificationEmail({
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      address: opts.address,
      experience: opts.experience,
      wantsFoster: opts.wantsFoster,
      wantsJailBreak: opts.wantsJailBreak,
      jailBreakApproveUrl,
      personUrl: `${siteUrl()}/people/${opts.personId}`,
    });
    const ack = applicantAckEmail({
      firstName: opts.firstName,
      wantsFoster: opts.wantsFoster,
      wantsJailBreak: opts.wantsJailBreak,
    });

    const [r1, r2] = await Promise.all([
      sendEmail({ to: adminEmail, subject: admin.subject, text: admin.text, html: admin.html }),
      sendEmail({ to: opts.email, subject: ack.subject, text: ack.text, html: ack.html }),
    ]);
    if (!r1.ok) console.error("homecare admin email failed:", r1.error);
    if (!r2.ok) console.error("homecare ack email failed:", r2.error);
  } catch (e) {
    console.error("sendHomecareEmails threw:", e);
  }
}
