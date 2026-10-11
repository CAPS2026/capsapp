/** How long the "Stop this medication" link in a course finished email works. */
export const COURSE_LINK_DAYS = 14;

/** Whether the link has run out, counted from when the course was flagged as finished. */
export function courseLinkExpired(flaggedAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(flaggedAt).getTime() > COURSE_LINK_DAYS * 24 * 60 * 60000;
}
