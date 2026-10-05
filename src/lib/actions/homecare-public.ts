"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { addAdoptionInterest, sendAdoptionEmails } from "@/lib/adoption-notify";
import { savePersonPhotoFromDataUrl } from "@/lib/person-photo-upload";
import { submitHomecareApplication, type HomecareApplicationInput } from "@/lib/homecare-apply-core";

// Public, unauthenticated homecare form (the one behind the QR code). The
// person identifies themselves by email AND surname so a stranger can't
// attach an application to someone else's record just by guessing an email.

function clean(s: string | undefined | null) {
  return (s ?? "").trim();
}

async function findPerson(email: string, surname: string, firstName?: string, dateOfBirth?: string) {
  const e = clean(email).toLowerCase();
  const sn = clean(surname).toLowerCase();
  if (!sn) return null;
  const admin = createAdminClient();
  const pick = (p: { id: unknown; first_name: unknown }) => ({ id: p.id as string, firstName: p.first_name as string });
  // 1. Email + surname.
  if (e) {
    const { data } = await admin.from("people").select("id, first_name, surname, email").ilike("email", e).limit(2);
    const match = (data ?? []).find((p) => (p.surname as string).trim().toLowerCase() === sn);
    if (match) return pick(match);
  }
  // 2. First name + surname + date of birth, for people who've changed email.
  const fn = clean(firstName).toLowerCase();
  const dob = clean(dateOfBirth);
  if (fn && dob) {
    const { data } = await admin
      .from("people")
      .select("id, first_name, surname")
      .eq("date_of_birth", dob)
      .ilike("surname", sn)
      .limit(5);
    const match = (data ?? []).find((p) => (p.first_name as string).trim().toLowerCase() === fn);
    if (match) return pick(match);
  }
  return null;
}

/** Step 1: is this person already registered? Reveals nothing but yes/no. */
export async function checkHomecareApplicant(input: {
  email: string;
  surname: string;
  firstName?: string;
  dateOfBirth?: string;
  website: string;
}): Promise<{ registered: boolean }> {
  if (clean(input.website)) return { registered: false };
  return { registered: !!(await findPerson(input.email, input.surname, input.firstName, input.dateOfBirth)) };
}

/** Step 2 (registered people): just the home details — everything else is on file. */
export async function applyForHomecarePublic(input: {
  email: string;
  surname: string;
  firstName?: string;
  dateOfBirth?: string;
  website: string;
  application: HomecareApplicationInput;
  /** Optional photo (JPEG data URL); only saved if they don't already have one. */
  photoData?: string;
}): Promise<{ error: string } | { ok: true; error?: undefined }> {
  if (clean(input.website)) return { ok: true }; // honeypot: look successful, write nothing
  const person = await findPerson(input.email, input.surname, input.firstName, input.dateOfBirth);
  if (!person) return { error: "We couldn't match those details to a registered volunteer." };

  const result = await submitHomecareApplication(createAdminClient(), person.id, input.application, {
    fillBlanksOnly: true,
  });
  if (result.error) return { error: result.error };
  await savePersonPhotoFromDataUrl(createAdminClient(), person.id, input.photoData, { onlyIfBlank: true });
  return { ok: true };
}

/** Registered people who tick Adoption: records the interest and tells CAPS. */
export async function applyForAdoptionPublic(input: {
  email: string;
  surname: string;
  firstName?: string;
  dateOfBirth?: string;
  website: string;
  photoData?: string;
}): Promise<{ error: string } | { ok: true; error?: undefined }> {
  if (clean(input.website)) return { ok: true };
  const person = await findPerson(input.email, input.surname, input.firstName, input.dateOfBirth);
  if (!person) return { error: "We couldn't match those details to a registered volunteer." };

  const admin = createAdminClient();
  const r = await addAdoptionInterest(admin, person.id);
  if (r.error) return { error: r.error };
  if (r.added) {
    const { data: row } = await admin.from("people").select("first_name, surname, email, phone").eq("id", person.id).maybeSingle();
    if (row?.email) {
      await sendAdoptionEmails(admin, {
        personId: person.id,
        firstName: row.first_name as string,
        name: `${row.first_name} ${row.surname}`.trim(),
        email: row.email as string,
        phone: (row.phone as string | null) ?? "",
      });
    }
  }
  await savePersonPhotoFromDataUrl(admin, person.id, input.photoData, { onlyIfBlank: true });
  return { ok: true };
}
