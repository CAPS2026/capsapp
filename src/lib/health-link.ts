/** How long the "Mark as dealt with" link in a health concern email works. */
export const HEALTH_LINK_DAYS = 14;

/** Whether a concern's email link has run out (see HEALTH_LINK_DAYS). */
export function healthLinkExpired(createdAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() > HEALTH_LINK_DAYS * 24 * 60 * 60000;
}
