// Client-safe: the SavourLife listing states we record, in SavourLife's own words.
export type SlStatus = "not_listed" | "listed" | "on_hold" | "adopted" | "removed";

export const SL_STATUSES: { code: SlStatus; label: string; help: string }[] = [
  { code: "not_listed", label: "Not listed", help: "Not on SavourLife yet." },
  { code: "listed", label: "Listed", help: "Live on SavourLife. Enter the SavourLife ID it gave you." },
  {
    code: "on_hold",
    label: "On hold",
    help: "Paused. Tick On Hold on SavourLife first, then choose the reason here.",
  },
  {
    code: "adopted",
    label: "Adopted",
    help: "Tick 'I have been adopted' on SavourLife and enter the enquiry number it shows.",
  },
  { code: "removed", label: "Removed", help: "Taken off SavourLife (Remove Dog)." },
];

/** SavourLife's own reasons for putting a dog on hold. */
export const SL_HOLD_REASONS = [
  "Processing Applications",
  "On-Trial",
  "Medical Treatment / Temporarily Unavailable",
  "Not Ready for Inquiries",
  "In Training",
];

export const slStatusLabel = (code: string | null | undefined) =>
  SL_STATUSES.find((s) => s.code === code)?.label ?? "Not listed";
