// Volunteer terms & conditions shown on the registration form.
// Text supplied by CAPS (matches the "Accepting terms and conditions, and
// Consent" section of the original Google Form). Plain text — blank lines
// separate paragraphs.
export const VOLUNTEER_TERMS = `
I acknowledge that volunteering with Cape Animal Protection Shelter Inc. (CAPS) involves direct interaction with animals and associated risks including but not limited to animal bites, scratches, allergic reactions, and zoonotic disease.

I confirm that I am physically fit to undertake the volunteer activities I have selected.

I agree to follow all CAPS guidelines, training, instructions, and safety protocols at all times.

I understand that CAPS, its board, staff, and volunteers accept no liability for any injury, illness, or damage to person or property sustained during volunteer activities.

I will sign in whenever I come on site.

I acknowledge that I am responsible for my own personal accident insurance and that CAPS does not provide cover for volunteers.
`.trim();

export const VOLUNTEER_TERMS_READY = true;

// Foster care & jail break terms, from the "CAPS Foster & Jail Break Program"
// form (updated forms, 2026-10-07). Shown instead of the volunteer terms when
// someone is taking a dog home. Pending Paul's check of the exact wording.
export function homecareTerms(opts: { foster: boolean; jailBreak: boolean }): string {
  const parts: string[] = [];
  if (opts.foster) {
    parts.push(
      "Foster care requirements:\n- A suitable, secure yard\n- A yard inspection and compliance check\n- Real estate approval for rental properties",
    );
  }
  if (opts.jailBreak) {
    parts.push(
      "Jail Break requirements:\n- A suitable, secure yard\n- Dogs must not be left unattended while in your care\n- Real estate approval is not required, as the dog is considered to be visiting rather than residing at the property",
    );
  }
  parts.push(
    "Important information: Animals entering CAPS care may not have all veterinary work completed at the time of placement. Depending on the animal's age, health status, and veterinary availability, treatments such as vaccinations, desexing, microchipping, heartworm testing, or other veterinary procedures may be completed while the animal is in foster care.",
    "Agreement:\n1. I accept full responsibility for the foster animal(s) while in my care.\n2. I will provide a safe and loving environment.\n3. I will notify CAPS of any concerns immediately.",
  );
  return parts.join("\n\n");
}
