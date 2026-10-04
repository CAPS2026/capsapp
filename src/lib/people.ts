import type { Role } from "@/lib/auth";

// Client-safe labels / styling for roles + statuses. No server imports —
// this is pulled into Client Components.

export const ROLE_LABEL: Record<Role, string> = {
  volunteer: "Volunteer",
  volunteer_plus: "Volunteer +",
  jailbreak_carer: "Jail break carer",
  foster_carer: "Foster carer",
  adopter: "Adopter",
  staff: "Staff",
  committee: "Committee",
  admin: "Admin",
};

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  volunteer: "bg-brand-tint text-brand-ink",
  volunteer_plus: "bg-brand-ink text-white",
  jailbreak_carer: "bg-sun text-ink",
  foster_carer: "bg-warm text-ink",
  adopter: "bg-gray-tint text-ink-muted",
  staff: "bg-ink text-white",
  committee: "bg-[#6b7a99] text-white",
  admin: "bg-danger text-white",
};

export type RoleStatus = "pending" | "active" | "exited" | "declined";

export const STATUS_LABEL: Record<RoleStatus, string> = {
  pending: "Pending",
  active: "Active",
  exited: "Ended",
  declined: "Declined",
};

export const STATUS_TEXT_CLASS: Record<RoleStatus, string> = {
  pending: "text-warm-ink",
  active: "text-ok",
  exited: "text-ink-muted",
  declined: "text-ink-muted",
};

/** Public URL for a person's photo (people-photos is a public bucket).
 *  `version` (their updated_at) busts the browser cache after a re-upload. */
export function personPhotoUrl(
  path: string | null | undefined,
  version?: string | null,
): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const v = version ? `?v=${encodeURIComponent(version)}` : "";
  return `${base}/storage/v1/object/public/people-photos/${path}${v}`;
}
