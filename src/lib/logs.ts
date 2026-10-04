// Client-safe types + helpers for the Logs screen (docs/ui-flows.md §10).

export type LogTab =
  | "activity"
  | "walks"
  | "jail_break"
  | "foster"
  | "homecare"
  | "yard"
  | "bed_rest"
  | "medical"
  | "site"
  | "dogs"
  | "people";

export const LOG_TABS: { key: LogTab; label: string }[] = [
  { key: "activity", label: "All activity" },
  { key: "walks", label: "Walks" },
  { key: "jail_break", label: "Jail Break" },
  { key: "foster", label: "Foster" },
  { key: "homecare", label: "Jail Break + Foster" },
  { key: "yard", label: "Yard" },
  { key: "bed_rest", label: "Bed Rest" },
  { key: "medical", label: "Medical" },
  { key: "site", label: "Visitors" },
  { key: "dogs", label: "Dogs" },
  { key: "people", label: "People" },
];

/** The activity types, for the type chips on the All activity tab. */
export const ACTIVITY_TYPES: { key: string; label: string }[] = [
  { key: "walk", label: "Walk" },
  { key: "yard", label: "Yard" },
  { key: "bed_rest", label: "Bed Rest" },
  { key: "jail_break", label: "Jail Break" },
  { key: "foster", label: "Foster" },
];

/** Tabs backed by the dog_activity table (they share the richer filters). */
export const ACTIVITY_TABS: LogTab[] = ["activity", "walks", "jail_break", "foster", "homecare", "yard", "bed_rest"];

/** Tabs that are registers, not activity — only the date range applies. */
export const REGISTER_TABS: LogTab[] = ["dogs", "people"];

export function isLogTab(v: string | undefined | null): v is LogTab {
  return !!v && LOG_TABS.some((t) => t.key === v);
}

export type LogTable = {
  columns: string[];
  rows: Record<string, string>[];
  /** true when the row limit was hit and older rows aren't shown. */
  capped: boolean;
  /** One-line totals for the rows shown, e.g. "12 records · 8h 45m · 5 dogs". */
  summary?: string;
};

export type LogFilters = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  dogId?: string;
  personId?: string;
  /** Activity types to include (All activity tab only); empty = all. */
  types?: string[];
  /** open = still out, closed = returned. */
  status?: "open" | "closed";
  /** Only rows logged after the fact / edited. */
  flag?: "late" | "edited";
  /** Free text, matched against the notes / reason. */
  q?: string;
};

export function rowsToCsv(columns: string[], rows: Record<string, string>[]): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [columns.map(esc).join(",")];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c] ?? "")).join(","));
  return lines.join("\r\n");
}
