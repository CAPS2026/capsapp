import type { Part } from "@/lib/shift";

/** Client-safe helpers for telling a shift about health concerns: the box in
 *  the sidebar and the "Keep an eye on" task for the next shift. */

/** Shifts in order: a number for (date, part), so "the next shift" is +1. */
export function sessionOrdinal(date: string, part: Part): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000) * 2 + (part === "afternoon" ? 1 : 0);
}

/** The shift straight after (date, part): morning then afternoon the same
 *  day, afternoon then the next morning. */
export function nextSession(date: string, part: Part): { date: string; part: Part } {
  if (part === "morning") return { date, part: "afternoon" };
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { date: next.toISOString().slice(0, 10), part: "morning" };
}

/** What a shift's sidebar shows for one concern:
 *  - "open": raised on this shift, not dealt with yet ("HEALTH CONCERN")
 *  - "dealt": raised on this shift, marked dealt with ("DEALT WITH")
 *  - "watch": raised on an earlier shift, so keep an eye on the dog
 *    ("KEEP AN EYE ON"): always for the very next shift, and for any later
 *    shift while it is still not dealt with.
 *  - null: nothing to show. */
export type HealthWatchState = "open" | "dealt" | "watch";

export function healthWatchState(
  concern: { date: string; part: Part; resolved: boolean },
  current: { date: string; part: Part },
): HealthWatchState | null {
  const then = sessionOrdinal(concern.date, concern.part);
  const now = sessionOrdinal(current.date, current.part);
  if (now < then) return null;
  if (now === then) return concern.resolved ? "dealt" : "open";
  if (now === then + 1) return "watch";
  return concern.resolved ? null : "watch";
}

/** "Keep an eye on Zeke: Wound on Zekes back" (first line of what was
 *  typed, trimmed to a readable length). */
export function healthWatchTitle(dogName: string | null, body: string): string {
  const firstLine = (body.split("\n")[0] ?? "").trim().replace(/[.\s]+$/, "");
  const short = firstLine.length > 70 ? `${firstLine.slice(0, 67).trimEnd()}...` : firstLine;
  const dog = dogName?.trim() || "the dog";
  return short ? `Keep an eye on ${dog}: ${short}` : `Keep an eye on ${dog}`;
}
