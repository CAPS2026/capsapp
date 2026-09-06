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
};

export type StatusMeta = { code: DogStatus; label: string; sortOrder: number; isOut: boolean };

export type OrgSettings = {
  walkAlertAfterMinutes: number;
  yardAlertAfterMinutes: number;
  needsWalkAfterDays: number;
};

/** CSS custom property (docs/design.md) holding each status's accent colour. */
export const STATUS_COLOR_VAR: Record<DogStatus, string> = {
  walking: "--status-walking",
  yard: "--status-yard",
  available: "--status-available",
  bed_rest: "--status-bed-rest",
  jail_break: "--status-jail-break",
  fostered: "--status-fostered",
};
