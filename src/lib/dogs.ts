// Client-safe types and constants for the Dogs list — no server-only imports
// here, so this can be imported from Client Components. The actual data
// fetch (which needs the server Supabase client) lives in dogs-data.ts.

export type DogStatus = "walking" | "yard" | "available" | "bed_rest" | "jail_break" | "fostered";

export type CurrentActivity = {
  type: string;
  personId: string | null;
  personName: string | null;
  startedAt: string;
  dueBack: string | null;
  reason: string | null;
};

export type DogListItem = {
  id: string;
  ref: string;
  name: string;
  status: DogStatus;
  experiencedHandlerOnly: boolean;
  photoUrl: string | null;
  current: CurrentActivity | null;
  lastWalkAt: string | null;
  /** Total minutes walked in the trailing 28 days (completed walks only). */
  fourWeekWalkMinutes: number;
};

export type StatusMeta = { code: DogStatus; label: string; sortOrder: number; isOut: boolean };

export type OrgSettings = {
  walkAlertAfterMinutes: number;
  yardAlertAfterMinutes: number;
  needsWalkAfterDays: number;
};

/**
 * Button label for closing out whichever activity is currently open — "End
 * Walk" matches the old AppSheet app's own action name. Jail Break and
 * Foster get their own distinct labels rather than the old app's combined
 * "Homecare" (Paul's call, 2026-09-06: clearer beats matching legacy here).
 * Yard has no legacy equivalent (a new status this rebuild introduced).
 */
export function endActionLabel(status: DogStatus): string {
  switch (status) {
    case "walking":
      return "End Walk";
    case "yard":
      return "End Yard";
    case "bed_rest":
      return "End Bed Rest";
    case "jail_break":
      return "End Jail Break";
    case "fostered":
      return "End Foster";
    case "available":
      return "End"; // unreachable in practice — only out dogs get this button
  }
}

/** CSS custom property (docs/design.md) holding each status's accent colour. */
export const STATUS_COLOR_VAR: Record<DogStatus, string> = {
  walking: "--status-walking",
  yard: "--status-yard",
  available: "--status-available",
  bed_rest: "--status-bed-rest",
  jail_break: "--status-jail-break",
  fostered: "--status-fostered",
};
