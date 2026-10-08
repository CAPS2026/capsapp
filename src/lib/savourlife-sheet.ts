// Builds the SavourLife transfer sheet: every answer SavourLife's "Add New Dog" form asks
// for, in the order that form uses, as plain text ready to copy. Pure functions so the
// page can show it and "Copy all" can reuse the same list.
import type { IntakeInput } from "@/lib/intake";

export type SheetField = {
  label: string;
  value: string;
  /** SavourLife needs this to list the dog. */
  required?: boolean;
  /** Shown above the field as a small heading, when it starts a new group. */
  group?: string;
};

const yesNo = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "");
const untested = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "Untested");

/** 2026-10-09 -> 09/10/2026 (how it's typed into SavourLife). */
function dmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function ageText(dob: string, today = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!m) return "";
  const months = (today.getFullYear() - +m[1]) * 12 + (today.getMonth() + 1 - +m[2]) - (today.getDate() < +m[3] ? 1 : 0);
  if (months < 0) return "";
  const y = Math.floor(months / 12);
  const mo = months % 12;
  return [y > 0 && `${y} year${y === 1 ? "" : "s"}`, mo > 0 && `${mo} month${mo === 1 ? "" : "s"}`].filter(Boolean).join(" ") || "Under 1 month";
}

export function buildSavourLifeFields(f: IntakeInput): SheetField[] {
  return [
    { group: "The dog", label: "Name", value: f.name, required: true },
    { label: "Breed", value: f.breed, required: true },
    { label: "Date of birth", value: f.dateOfBirth ? dmy(f.dateOfBirth) : "", required: true },
    { label: "Age (SavourLife works this out)", value: ageText(f.dateOfBirth) },
    { label: "Sex", value: f.sex === "M" ? "Male" : f.sex === "F" ? "Female" : "" },
    { label: "Size when adult", value: f.sizeWhenAdult },
    { label: "Coat length", value: f.coatLength },
    { label: "Microchip number", value: f.microchip },
    { group: "Profile", label: "Profile — personality and best features", value: f.description },
    { label: "Foster / case manager email", value: f.contactEmail },
    { group: "Can they be re-homed with", label: "Kids under 5", value: untested(f.goodWithKidsU5) },
    { label: "Kids 5 to 12", value: untested(f.goodWithKids5to12) },
    { label: "Other cats", value: untested(f.goodWithCats) },
    { label: "Other dogs", value: untested(f.goodWithDogs) },
    { label: "Other animals", value: untested(f.goodWithOther) },
    { group: "Medical (at the time of adoption)", label: "Desexed", value: yesNo(f.desexed) },
    { label: "Vaccinated", value: yesNo(f.vaccinated) },
    { label: "Wormed", value: yesNo(f.wormed) },
    { label: "Heart wormed", value: yesNo(f.heartworm) },
    { label: "Medical issues", value: f.medicalIssues },
    { label: "Special needs", value: f.specialNeeds },
    { group: "Home needs", label: "Indoor only", value: yesNo(f.indoorOnly) },
    {
      label: "Bonded pair",
      value: f.bondedPair === "yes" ? `Yes${f.bondedPairName ? ` — with ${f.bondedPairName}` : ""}` : yesNo(f.bondedPair),
    },
    { group: "Location", label: "Suburb", value: f.suburb },
    { label: "State", value: f.state },
    { label: "Postcode", value: f.postcode, required: true },
    { label: "Distance restriction", value: f.distance },
    { label: "Interstate adoption available", value: yesNo(f.interstate) },
    { group: "Adoption", label: "Adoption fee ($)", value: f.adoptionFee ? String(parseFloat(f.adoptionFee)) : "", required: true },
    { label: "Foster carer required", value: yesNo(f.fosterRequired) },
  ];
}

/** Everything in one block, "Label: value" per line, for the Copy all button. */
export function sheetAsText(fields: SheetField[]): string {
  const lines: string[] = [];
  for (const fld of fields) {
    if (fld.group) {
      if (lines.length) lines.push("");
      lines.push(`— ${fld.group} —`);
    }
    lines.push(`${fld.label}: ${fld.value || "(blank)"}`);
  }
  return lines.join("\n");
}

/** What SavourLife needs that is still missing. */
export function sheetMissing(fields: SheetField[], photoCount: number): string[] {
  const out = fields.filter((f) => f.required && !f.value.trim()).map((f) => f.label);
  if (photoCount === 0) out.push("At least one photo");
  return out;
}
