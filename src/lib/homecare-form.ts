// Client-safe shape of the "home details" part of a homecare application,
// shared by the staff form, the public homecare form and the registration
// form's homecare section.

export type YesNo = "" | "yes" | "no";

/** One other animal living at the home. */
export type Pet = {
  type: string;
  breed: string;
  age: string;
  temperament: string;
  desexed: YesNo;
  vaccinated: YesNo;
};

export const EMPTY_PET: Pet = { type: "", breed: "", age: "", temperament: "", desexed: "", vaccinated: "" };

export type HomeDetails = {
  propertyOwnership: string;
  fenceType: string;
  fenceHeight: string;
  peopleAtHome: string;
  childrenU16: string;
  /** Age of each child under 16 (first childrenU16 entries are used). */
  childAges: string[];
  otherAnimals: string;
  /** Older free-text answer; replaced by `pets` once any are entered. */
  animalDetails: string;
  pets: Pet[];
  vaccines: "" | "yes" | "no";
  jbDay: boolean;
  jbWeekend: boolean;
  jbShift: boolean;
  jbSchool: boolean;
  fosterShort: boolean;
  fosterLong: boolean;
};

export const EMPTY_HOME: HomeDetails = {
  propertyOwnership: "",
  fenceType: "",
  fenceHeight: "",
  peopleAtHome: "",
  childrenU16: "",
  childAges: [],
  otherAnimals: "",
  animalDetails: "",
  pets: [],
  vaccines: "",
  jbDay: false,
  jbWeekend: false,
  jbShift: false,
  jbSchool: false,
  fosterShort: false,
  fosterLong: false,
};

const yn = (v: YesNo) => (v === "yes" ? "yes" : v === "no" ? "no" : "?");

function childCount(h: HomeDetails) {
  const n = parseInt(h.childrenU16, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The mandatory home-and-garden questions. Returns what's missing, or null. */
export function homeDetailsError(h: HomeDetails): string | null {
  if (!h.propertyOwnership) return "Please say whether you own or rent your property.";
  if (!h.fenceType) return "Please choose your fence type.";
  if (!h.fenceHeight) return "Please choose your fence height.";
  if (!h.peopleAtHome) return "Please say how many people live at home.";
  if (!h.childrenU16) return "Please say how many children under 16 live at home (choose None if there are none).";
  for (let i = 0; i < childCount(h); i++) {
    if (!(h.childAges[i] ?? "").trim()) return `Please give the age of child ${i + 1}.`;
  }
  if (!h.otherAnimals) return "Please say whether you have other animals at home.";
  if (h.otherAnimals === "Yes") {
    if (h.pets.length === 0) return "Please add details for each animal you have.";
    for (let i = 0; i < h.pets.length; i++) {
      const p = h.pets[i];
      if (!p.type || !p.breed.trim() || !p.age.trim() || !p.temperament || !p.desexed || !p.vaccinated)
        return `Please complete every question for animal ${i + 1}.`;
    }
  }
  return null;
}

/** Flatten the structured answers into the text the database already stores. */
function animalSummary(h: HomeDetails) {
  const n = childCount(h);
  const ages = h.childAges.slice(0, n);
  const lines: string[] = [];
  if (ages.some((a) => a.trim())) lines.push(`Children under 16 — ages: ${ages.map((a) => a.trim() || "?").join(", ")}`);
  h.pets.forEach((p, i) =>
    lines.push(
      `Animal ${i + 1}: ${p.type}; breed: ${p.breed.trim()}; age: ${p.age.trim()}; temperament: ${p.temperament}; desexed: ${yn(p.desexed)}; vaccinations up to date: ${yn(p.vaccinated)}`,
    ),
  );
  // Anything typed in the old free-text box (or by the assessor) is kept, not replaced.
  if (lines.length && h.animalDetails.trim()) lines.push(`Notes: ${h.animalDetails.trim()}`);
  return lines;
}

/** The reverse of animalSummary: read structured answers back out of the stored text.
 *  Lines that aren't in that format come back as `extra` so nothing is lost. */
export function parseHomeText(text: string | null | undefined): { childAges: string[]; pets: Pet[]; extra: string } {
  const childAges: string[] = [];
  const pets: Pet[] = [];
  const extra: string[] = [];
  const back = (v: string): YesNo => (v === "yes" ? "yes" : v === "no" ? "no" : "");
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("Children under 16 — ages:")) {
      for (const a of line.slice(line.indexOf(":") + 1).split(",")) childAges.push(a.trim() === "?" ? "" : a.trim());
    } else if (/^Animal \d+:/.test(line)) {
      const parts = line.replace(/^Animal \d+:\s*/, "").split(";").map((p) => p.trim());
      const get = (k: string) => parts.find((p) => p.startsWith(`${k}:`))?.slice(k.length + 1).trim() ?? "";
      pets.push({
        type: parts[0] ?? "",
        breed: get("breed"),
        age: get("age"),
        temperament: get("temperament"),
        desexed: back(get("desexed")),
        vaccinated: back(get("vaccinations up to date")),
      });
    } else if (line.startsWith("Notes:")) {
      extra.push(line.slice(6).trim());
    } else {
      extra.push(line);
    }
  }
  return { childAges, pets, extra: extra.join("\n") };
}

/** What the server actions take: the form's home details, flattened. */
export function homePayload(h: HomeDetails) {
  return {
    propertyOwnership: h.propertyOwnership,
    fenceType: h.fenceType,
    fenceHeight: h.fenceHeight,
    peopleAtHome: h.peopleAtHome,
    childrenU16: h.childrenU16,
    otherAnimals:
      h.otherAnimals === "Yes" && h.pets.length
        ? `Yes — ${h.pets.length}: ${h.pets.map((p) => p.type).join(", ")}`
        : h.otherAnimals,
    animalDetails: animalSummary(h).length ? animalSummary(h).join("\n") : h.animalDetails,
    vaccinesCurrent: h.pets.length
      ? h.pets.every((p) => p.vaccinated === "yes")
        ? true
        : h.pets.some((p) => p.vaccinated === "no")
          ? false
          : null
      : h.vaccines === ""
        ? null
        : h.vaccines === "yes",
    jbDay: h.jbDay,
    jbWeekend: h.jbWeekend,
    jbShift: h.jbShift,
    jbSchool: h.jbSchool,
    fosterShort: h.fosterShort,
    fosterLong: h.fosterLong,
  };
}
