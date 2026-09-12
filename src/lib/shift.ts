// Client-safe types and pure helpers for the standalone CAPS Staff app
// (shift sign-in, checklist, handover). Deliberately independent of
// src/lib/staff.ts (the old dog-app "Staff" tab) rather than importing
// from it, that file backs a screen being retired separately, and this
// app shouldn't end up coupled to code someone else may remove. A little
// duplication of small pure helpers is the trade-off.

export const SHELTER_TZ = "Australia/Brisbane";

/** "Today" in the shelter's own timezone (Weipa, QLD, UTC+10, no DST). */
export function shelterToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHELTER_TZ }).format(new Date());
}

export type Part = "morning" | "afternoon";
export const PARTS: Part[] = ["morning", "afternoon"];
export const PART_LABEL: Record<Part, string> = { morning: "Morning", afternoon: "Afternoon" };

/** Which part a moment falls in, shelter-local. Used to guess the part
 *  for someone who isn't rostered either way today. */
export function partForTime(d: Date = new Date()): Part {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", { timeZone: SHELTER_TZ, hour: "2-digit", hour12: false }).format(d),
  );
  return hour < 12 ? "morning" : "afternoon";
}

export type TaskCategory =
  | "opening"
  | "animal_health_welfare"
  | "kennel_housing_hygiene"
  | "exercise_enrichment"
  | "public_committee_areas"
  | "end_of_day";

export const CATEGORY_ORDER: TaskCategory[] = [
  "opening",
  "animal_health_welfare",
  "kennel_housing_hygiene",
  "exercise_enrichment",
  "public_committee_areas",
  "end_of_day",
];

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  opening: "Opening",
  animal_health_welfare: "Animal Health & Welfare",
  kennel_housing_hygiene: "Kennel & Housing Hygiene",
  exercise_enrichment: "Exercise & Enrichment",
  public_committee_areas: "Public & Committee Areas",
  end_of_day: "End of Day",
};

export type TaskStatus = "open" | "done" | "not_required";

export type ShiftPerson = { id: string; name: string; part: Part | null };

export type ShiftTaskRow = {
  id: string;
  templateId: string | null;
  date: string;
  part: Part;
  category: TaskCategory | null; // null only for is_extra rows
  title: string;
  status: TaskStatus;
  note: string | null;
  isExtra: boolean;
  claimedById: string | null;
  claimedByName: string | null;
  actionedByName: string | null;
  actionedByInitials: string | null;
  actionedAt: string | null;
  carriedOver: boolean;
};

export type OpenShift = {
  id: string;
  personId: string;
  part: Part;
  startedAt: string;
  lateMinutes: number | null;
  lateReason: string | null;
  rostered: boolean;
};

/** "Jo B" -> "JB". Falls back to the first initial, then "?". */
export function initials(first: string, last: string): string {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || a.toUpperCase() || "?";
}

/** Local "YYYY-MM-DD" for a Date (not UTC). */
export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Parse "YYYY-MM-DD" as a local date (midnight local), or today if bad. */
export function parseYmd(s: string | null | undefined): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function shiftDay(s: string, deltaDays: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + deltaDays);
  return ymd(d);
}

/** Straight-line distance in metres between two lat/lng points. */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** "HH:MM" (or "HH:MM:SS" from Postgres `time`) -> minutes since midnight. */
function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes after `sessionStart` ("HH:MM") that `at` falls, shelter-local.
 *  0 or negative means on time or early. */
export function minutesLate(at: Date, sessionStart: string): number {
  const nowMinutes = hhmmToMinutes(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SHELTER_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(at),
  );
  return nowMinutes - hhmmToMinutes(sessionStart);
}
