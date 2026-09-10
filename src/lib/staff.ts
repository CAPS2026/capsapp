// Client-safe constants, types and helpers for the Staff zone (roster +
// daily tasks). No server imports.

// The shelter is in Weipa, Queensland — UTC+10, no daylight saving. "Today"
// on the server (UTC on Vercel) is not the shelter's today late in the day,
// so any server-side calendar-date logic must go through this.
export const SHELTER_TZ = "Australia/Brisbane";
export function shelterToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHELTER_TZ }).format(new Date());
}

export type Part = "morning" | "afternoon";
export const PARTS: Part[] = ["morning", "afternoon"];
export const PART_LABEL: Record<Part, string> = { morning: "Morning", afternoon: "Afternoon" };

export type RepeatKind = "daily" | "weekly" | "monthly";
export const REPEAT_LABEL: Record<RepeatKind, string> = {
  daily: "Every day",
  weekly: "Weekly",
  monthly: "Monthly",
};

// 0 = Sunday .. 6 = Saturday, matching JS Date.getDay().
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type TaskStatus = "open" | "done" | "not_required";

export type RosterPerson = { id: string; name: string };

export type RosterSession = {
  id: string;
  part: Part;
  starts: string; // "HH:MM"
  ends: string;
  people: RosterPerson[];
};

export type TaskRow = {
  id: string;
  templateId: string | null;
  date: string; // "YYYY-MM-DD" — the day the task is for
  part: Part;
  title: string;
  status: TaskStatus;
  note: string | null;
  actionedByName: string | null;
  actionedByInitials: string | null;
  actionedAt: string | null;
  /** True when this open task is being carried over from an earlier day. */
  carriedOver: boolean;
  /** A future-day preview of a recurring task — not a real row yet, not
   *  tickable. It becomes a real instance when that day is opened. */
  isPreview: boolean;
};

export type TaskTemplateRow = {
  id: string;
  title: string;
  part: Part;
  repeat: RepeatKind;
  weekdays: number[];
  dayOfMonth: number | null;
  active: boolean;
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

/** Does a template fire on the given local date? */
export function templateMatchesDate(
  t: Pick<TaskTemplateRow, "repeat" | "weekdays" | "dayOfMonth">,
  date: Date,
): boolean {
  if (t.repeat === "daily") return true;
  if (t.repeat === "weekly") return t.weekdays.includes(date.getDay());
  if (t.repeat === "monthly" && t.dayOfMonth) {
    const dom = date.getDate();
    if (dom === t.dayOfMonth) return true;
    // 29/30/31 falls on the last day of a shorter month.
    const lastDom = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return t.dayOfMonth > lastDom && dom === lastDom;
  }
  return false;
}

export function describeRepeat(t: Pick<TaskTemplateRow, "repeat" | "weekdays" | "dayOfMonth">): string {
  if (t.repeat === "daily") return "Every day";
  if (t.repeat === "weekly") {
    if (t.weekdays.length === 0) return "Weekly (no days set)";
    if (t.weekdays.length === 7) return "Every day";
    return "Every " + [...t.weekdays].sort((a, b) => a - b).map((d) => WEEKDAYS[d]).join(", ");
  }
  if (t.repeat === "monthly" && t.dayOfMonth) {
    const n = t.dayOfMonth;
    const suffix =
      n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
    return `Monthly on the ${n}${suffix}`;
  }
  return "—";
}
