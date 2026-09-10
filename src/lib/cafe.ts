// Café mode — the shared-iPad surface.
//
// A staff member signs in on the shared device (full access), then taps
// "Hand to volunteers" to drop into a limited surface: walk + yard check
// in/out, basic dog info, site sign-in, the roster pickers — and nothing
// staff-only (no confidential/medical panels, no People admin, no
// placements, no deletes, no approvals). Getting back to full access needs
// the shared staff PIN.
//
// Mechanically it's one httpOnly cookie, CAFE_COOKIE. Present => a staff
// account is treated as Volunteer Plus (canKiosk stays true, isStaff goes
// false — see getCurrentPerson). Both toggles are server actions so a
// volunteer can't just clear the cookie from devtools.
//
// UNLOCK_COOKIE is a non-sensitive hint set when the PIN is accepted: it
// arms the client idle-guard (re-lock after 15 min idle) and carries a
// hard ceiling so a forgotten unlocked device re-locks on next load. A
// fresh staff sign-in has no unlock cookie, so it never auto-locks.

export const CAFE_COOKIE = "caps_cafe";
export const UNLOCK_COOKIE = "caps_unlock_until";

/** Idle time before a PIN-unlocked device drops back to café mode. */
export const UNLOCK_IDLE_MS = 15 * 60 * 1000;
/** Absolute ceiling on an unlock, regardless of activity. */
export const UNLOCK_MAX_MS = 3 * 60 * 60 * 1000;

export const PIN_MIN = 4;
export const PIN_MAX = 6;

/** A PIN is 4–6 digits, nothing else. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin);
}
