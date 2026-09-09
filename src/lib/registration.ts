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

// Homecare (fostering / jail break) is recorded as an interest but kept
// out of the on-site-help grid above — it's qualitatively different
// (triggers a separate approval process). Stored in
// `volunteer_profile.interests` for now; the full pending-role + email
// approval flow is a later build.
export const HOMECARE_INTEREST = "homecare";

// "How did you hear about us" — a fixed list (was free text). Propose /
// adjust freely; "other" reveals a text field.
export const HOW_HEARD_OPTIONS: { code: string; label: string }[] = [
  { code: "friend_family", label: "A friend or family member" },
  { code: "another_volunteer", label: "Another CAPS volunteer" },
  { code: "facebook", label: "Facebook" },
  { code: "instagram", label: "Instagram" },
  { code: "caps_website", label: "The CAPS website" },
  { code: "savourlife", label: "SavourLife" },
  { code: "news_radio", label: "Local newspaper or radio" },
  { code: "poster_flyer", label: "A poster or flyer" },
  { code: "event", label: "A CAPS event or stall" },
  { code: "web_search", label: "Google / web search" },
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
