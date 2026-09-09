import type { Role } from "@/lib/auth";

// Client-safe labels / styling for roles + statuses. No server imports —
// this is pulled into Client Components.

export const ROLE_LABEL: Record<Role, string> = {
  volunteer: "Volunteer",
  jailbreak_carer: "Jail break carer",
  foster_carer: "Foster carer",
  adopter: "Adopter",
  staff: "Staff",
  committee: "Committee",
};

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  volunteer: "bg-brand-tint text-brand-ink",
  jailbreak_carer: "bg-warm-tint text-warm-ink",
  foster_carer: "bg-warm-tint text-warm-ink",
  adopter: "bg-gray-tint text-ink-muted",
  staff: "bg-ink text-white",
  committee: "bg-ink text-white",
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
