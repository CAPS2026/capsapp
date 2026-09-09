// Client-safe constants, types and helpers for volunteer registration.
// Kept out of the "use server" action file so non-async values can be
// imported by Client and Server Components alike.
//
// The options here mirror the original CAPS "General Application" Google
// Form (screenshots supplied by Paul, 2026-09-09).

export type RegisterResult =
  | { ok: true; status: "active" | "pending" }
  | { ok?: undefined; error: string };

// "Please tick all activities you are interested in" — the Foster Care /
// Jail Break row is pulled out into its own section (see HOMECARE_* below).
export const VOLUNTEER_INTERESTS: { code: string; label: string }[] = [
  { code: "committee", label: "Committee Member" },
  { code: "fundraising", label: "Fundraising / Community Events" },
  { code: "dog_walking", label: "Dog Walking" },
  { code: "feeding_cleaning", label: "Shelter feeding and cleaning" },
  { code: "transport", label: "Pet transport" },
  { code: "pet_minding", label: "Pet minding (feed when owner is away)" },
  { code: "cooking", label: "Cooking / Food preparation" },
  { code: "social_media", label: "Social media" },
  { code: "wherever_useful", label: "Wherever I can be most useful" },
];
export const INTEREST_CODES = new Set(VOLUNTEER_INTERESTS.map((i) => i.code));

// Homecare (fostering / jail break) is asked as two checkboxes on the
// form. On submit each creates a pending `foster_carer` / `jailbreak_carer`
// role — the person_roles rows are the source of truth, not an interest
// code (see src/lib/actions/registration.ts + the step-4 approval flow).

// "Briefly describe your experience and confidence in handling dogs" —
// a single-choice question on the form. Required.
export const EXPERIENCE_OPTIONS: { code: string; label: string }[] = [
  { code: "none", label: "No experience" },
  { code: "basic", label: "Basic — I have owned a dog" },
  {
    code: "medium",
    label: "Medium — I have owned and trained several dogs or done some volunteering",
  },
  {
    code: "high",
    label: "High — I have professional level experience training or caring for dogs over many years",
  },
  { code: "other", label: "Other" },
];
export const EXPERIENCE_CODES = new Set(EXPERIENCE_OPTIONS.map((o) => o.code));
export function experienceLabel(code: string | null, other: string | null): string | null {
  if (!code) return null;
  if (code === "other") return other?.trim() || "Other";
  return EXPERIENCE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

// "How did you hear about volunteering with CAPS?"
export const HOW_HEARD_OPTIONS: { code: string; label: string }[] = [
  { code: "friend_colleague_family", label: "Friend, colleague or family member" },
  { code: "facebook", label: "Facebook" },
  { code: "signs_flyers", label: "Signs or flyers" },
  { code: "community_event", label: "Community event" },
  { code: "other", label: "Other" },
];
export const HOW_HEARD_CODES = new Set(HOW_HEARD_OPTIONS.map((o) => o.code));
export function howHeardLabel(code: string | null, other: string | null): string | null {
  if (!code) return null;
  if (code === "other") return other?.trim() || "Other";
  return HOW_HEARD_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

/** Whole years between `dob` and now, or null if unparseable. */
export function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}
