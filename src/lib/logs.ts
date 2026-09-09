// Client-safe types + helpers for the Logs screen (docs/ui-flows.md §10).

export type LogTab =
  | "walks"
  | "homecare"
  | "yard"
  | "bed_rest"
  | "medical"
  | "site"
  | "dogs"
  | "people";

export const LOG_TABS: { key: LogTab; label: string }[] = [
  { key: "walks", label: "Walks" },
  { key: "homecare", label: "Homecare" },
  { key: "yard", label: "Yard" },
  { key: "bed_rest", label: "Bed Rest" },
  { key: "medical", label: "Medical" },
  { key: "site", label: "Visitors" },
  { key: "dogs", label: "Dogs" },
  { key: "people", label: "People" },
];

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
};

export type LogFilters = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  dogId?: string;
  personId?: string;
};

export function rowsToCsv(columns: string[], rows: Record<string, string>[]): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [columns.map(esc).join(",")];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c] ?? "")).join(","));
  return lines.join("\r\n");
}
