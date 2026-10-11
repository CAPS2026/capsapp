export const EXIT_TYPES = [
  { code: "adopted", label: "Adopted" },
  { code: "transferred", label: "Transferred" },
  { code: "reclaimed", label: "Reclaimed" },
  { code: "death", label: "Death" },
] as const;

export type ExitTypeCode = (typeof EXIT_TYPES)[number]["code"];

export function exitTypeLabel(code: string | null): string {
  return EXIT_TYPES.find((t) => t.code === code)?.label ?? "Exited";
}
