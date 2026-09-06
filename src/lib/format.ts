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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Timer colour per docs/design.md: muted -> warm past the alert threshold -> danger at ~2x. */
export function timerColor(minutesElapsed: number, alertAfterMinutes: number): string {
  if (minutesElapsed >= alertAfterMinutes * 2) return "var(--danger)";
  if (minutesElapsed >= alertAfterMinutes) return "var(--warm)";
  return "var(--ink-muted)";
}
