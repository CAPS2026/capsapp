/** H:MM elapsed since an ISO timestamp, for live walk/yard timers. */
export function formatElapsed(startedAt: string): string {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function daysAgoLabel(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/** ISO timestamp -> local "YYYY-MM-DDTHH:mm" for pre-filling a datetime-local input. */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** 24-hour "HH:mm", per Paul's request (not 12-hour AM/PM). */
export function formatTime24(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n}st`;
  if (n % 10 === 2 && n % 100 !== 12) return `${n}nd`;
  if (n % 10 === 3 && n % 100 !== 13) return `${n}rd`;
  return `${n}th`;
}

/** "Sat, 6th Sep" — the short date format from Paul's 2026-09-06 text review. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-AU", { weekday: "short" });
  const month = d.toLocaleDateString("en-AU", { month: "short" });
  return `${weekday}, ${ordinal(d.getDate())} ${month}`;
}

/** "Started 10:51 Sat, 6th Sep" / "Due End 12:00 Sun, 7th Sep". */
export function formatStartedLine(label: string, iso: string): string {
  return `${label} ${formatTime24(iso)} ${formatShortDate(iso)}`;
}

/** "45 min" elapsed — for Walking's "Time Out" (alarm past the org's walk threshold). */
export function formatMinutesOut(startedAt: string): string {
  return `${minutesSince(startedAt)} min`;
}

/** "3d 4h" elapsed — for Bed Rest/Jail Break/Foster's "Time out" (multi-day stays). */
export function formatDaysHoursOut(startedAt: string): string {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  return `${days}d ${hours}h`;
}

/** Minutes -> "H:MM", for the trailing-4-week walk total on Available cards. */
export function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Timer colour per docs/design.md: muted -> warm past the alert threshold -> danger at ~2x. */
export function timerColor(minutesElapsed: number, alertAfterMinutes: number): string {
  if (minutesElapsed >= alertAfterMinutes * 2) return "var(--danger)";
  if (minutesElapsed >= alertAfterMinutes) return "var(--warm)";
  return "var(--ink-muted)";
}

/** "2y 3m" / "5 months" style span between two dates — used for age and time-with-CAPS. */
export function formatYearsMonths(fromIso: string, toIso?: string): string {
  const from = new Date(fromIso);
  const to = toIso ? new Date(toIso) : new Date();
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} month${remMonths === 1 ? "" : "s"}`;
  if (remMonths === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${remMonths}m`;
}
