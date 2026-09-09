// Client-safe constants, types and helpers for volunteer registration.
// Kept out of the "use server" action file so non-async values can be
// imported by Client and Server Components alike.

export type RegisterResult =
  | { ok: true; status: "active" | "pending" }
  | { ok?: undefined; error: string };

// Mirror of the `volunteer_interest` reference table (migration 02). Kept
// inline so the public page needs no DB round-trip; keep in sync if that
// table changes.
export const VOLUNTEER_INTERESTS: { code: string; label: string }[] = [
  { code: "dog_walking", label: "Dog walking" },
  { code: "feeding_cleaning", label: "Feeding & cleaning" },
  { code: "transport", label: "Pet transport" },
  { code: "pet_minding", label: "Pet minding" },
  { code: "cooking", label: "Cooking / food prep" },
  { code: "social_media", label: "Social media" },
  { code: "fundraising", label: "Fundraising / events" },
  { code: "committee", label: "Committee" },
  { code: "wherever_useful", label: "Wherever most useful" },
];

export const INTEREST_CODES = new Set(VOLUNTEER_INTERESTS.map((i) => i.code));

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
