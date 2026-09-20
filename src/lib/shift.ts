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

/** Each category gets its own accent so the checklist reads at a glance:
 *  a coloured edge and header tint per section. Requested by Julie on top
 *  of the mockup, which had every section white. The blue/amber/green
 *  come from the existing design tokens; coral, purple and slate are
 *  additions that sit comfortably alongside them. */
export const CATEGORY_STYLE: Record<TaskCategory, { accent: string; tint: string; ink: string }> = {
  opening: { accent: "#F4A324", tint: "#FEF3DC", ink: "#8A5A00" },
  animal_health_welfare: { accent: "#E2725B", tint: "#FCEDE8", ink: "#9A3A26" },
  kennel_housing_hygiene: { accent: "#1A7ABF", tint: "#E6F3FB", ink: "#0F5A8F" },
  exercise_enrichment: { accent: "#3F9D6B", tint: "#E9F5EF", ink: "#256B45" },
  public_committee_areas: { accent: "#7A5CB8", tint: "#F0EBF9", ink: "#54398D" },
  end_of_day: { accent: "#4A5A8A", tint: "#E8ECF6", ink: "#33406A" },
};

export type TaskStatus = "open" | "done" | "not_required";

export type ShiftPerson = {
  id: string;
  name: string;
  part: Part | null;
  /** "HH:MM" of today's session for `part`, null if not rostered. */
  starts: string | null;
  ends: string | null;
};

/** Stable avatar colour per person (from the mockup's blue / amber /
 *  green, plus a few more for a bigger team), so someone is the same
 *  colour on the picker, the sidebar roster and the handover log. */
const PERSON_COLOURS = ["#1A7ABF", "#C1800F", "#3F9D6B", "#7A5CB8", "#E2725B", "#4A5A8A"];
export function personColour(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PERSON_COLOURS[h % PERSON_COLOURS.length];
}

/** "Wayne Wilshire-Cumming" -> "Wayne". */
export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

/** A shift date + "HH:MM" as a real instant. Brisbane has no daylight
 *  saving, so "+10:00" is always right, no timezone library needed. Use
 *  this, not clock-time-of-day arithmetic, whenever the date matters
 *  (a shift from yesterday is over no matter what the clock says now). */
export function sessionInstant(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm.slice(0, 5)}:00+10:00`);
}

/** A timestamp as shelter-local clock time, e.g. "6:34am". Always pass
 *  the timezone explicitly: the server runs in UTC, so a bare
 *  toLocaleTimeString() there is ten hours out (that's what the
 *  end-of-shift email used to do), and it also makes server and browser
 *  render different text and trips React's hydration check. */
export function clock12(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-AU", { timeZone: SHELTER_TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s/g, "")
    .toLowerCase();
}

/** "6:30am" / "3:30pm" from "HH:MM". */
export function time12(hhmm: string): string {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** "6:30–9:30am" (suffix once when both halves share it). */
export function timeRange(starts: string, ends: string): string {
  const a = time12(starts);
  const b = time12(ends);
  const sa = a.slice(-2);
  return sa === b.slice(-2) ? `${a.slice(0, -2)}–${b}` : `${a}–${b}`;
}

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
  skippable: boolean;
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
  date: string;
  part: Part;
  startedAt: string;
  lateMinutes: number | null;
  lateReason: string | null;
  rostered: boolean;
  /** Metres from the shelter at sign-in, null if location wasn't shared. */
  distanceM: number | null;
  /** Overtime logged with "Extend shift", minutes past the rostered end. */
  extendedMinutes: number | null;
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
