import type { ReactNode } from "react";

// A label/value line for the detail cards. Short scalar values sit on one
// row (label left, value right — scannable like a table). Anything long —
// a sentence of handling notes, a full "how they heard" phrase, a comma
// list of interests — stacks the value under the label at full width so it
// reads as prose instead of a ragged right-aligned column on a phone.
//
// Renders nothing when the value is empty, so callers can list every
// possible field without guarding each one.
export function Field({
  label,
  value,
  /** Force the stacked layout regardless of length (e.g. always-prose fields). */
  block = false,
}: {
  label: string;
  value: ReactNode;
  block?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;

  const stacked = block || (typeof value === "string" && value.length > 24);

  if (stacked) {
    return (
      <div className="flex flex-col gap-0.5 py-0.5 text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="whitespace-pre-wrap">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-ink-muted shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
