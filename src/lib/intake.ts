// Client-safe lists and types for the dog intake screen. The paper "Animal Intake
// Record" turned into dropdowns so staff click a few things and only handwrite
// where it matters. Where SavourLife asks the same question, the choices follow
// their form (size, coat length) so the data can be pasted across unchanged.

export type YN = "" | "yes" | "no";

/** Where the dog came from. Values are arrival_type codes (migration 45 adds transfer / other). */
export const INTAKE_SOURCES: [string, string][] = [
  ["surrender", "Owner surrender"],
  ["rescue", "Rescue"],
  ["stray", "Stray"],
  ["pound", "Pound"],
  ["return", "Returned after adoption"],
  ["transfer", "Transfer from another group"],
  ["other", "Other"],
];

/** Sources where "surrendered by" makes sense. */
export const SOURCES_WITH_PERSON = ["surrender", "transfer", "return"];

export const INTAKE_REASONS = [
  "Owner moving / can't take the dog",
  "Cost of keeping the dog",
  "Behaviour concerns",
  "Owner ill or deceased",
  "Unwanted litter",
  "Found as a stray",
  "Released from the pound",
  "Neglect / cruelty case",
  "Other",
];

export const SEX_OPTIONS: [string, string][] = [
  ["M", "Male"],
  ["F", "Female"],
];

/** SavourLife's sizes: small / medium / large / extra large. */
export const SIZE_OPTIONS = ["Small", "Medium", "Large", "Extra large"];

export const COAT_LENGTHS = ["Short", "Medium", "Long"];

export const COLOURS = [
  "Black",
  "White",
  "Brown / chocolate",
  "Tan / fawn",
  "Red / ginger",
  "Golden / cream",
  "Grey / blue",
  "Brindle",
  "Black and tan",
  "Black and white",
  "Tricolour",
  "Merle",
  "Other",
];

/** Approximate age when the date of birth isn't known: label, months old (midpoint used as the estimate). */
export const AGE_BANDS: [string, string, number][] = [
  ["under6m", "Under 6 months", 3],
  ["6to12m", "6 – 12 months", 9],
  ["1to2y", "1 – 2 years", 18],
  ["2to4y", "2 – 4 years", 36],
  ["4to7y", "4 – 7 years", 66],
  ["7plus", "7 years or older", 108],
];

export const CONDITIONS: [string, string][] = [
  ["good", "Good"],
  ["fair", "Fair"],
  ["poor", "Poor"],
];

export const VACCINE_TYPES = ["C3", "C5", "C7", "Other / not sure"];

export const BEHAVIOUR_OPTIONS: [string, string][] = [
  ["friendly", "Friendly"],
  ["timid", "Timid"],
  ["aggressive", "Aggressive"],
  ["other", "Other"],
];

export const YES_NO_UNTESTED: [string, string][] = [
  ["yes", "Yes"],
  ["no", "No"],
  ["untested", "Not tested"],
];

/** Common breeds as suggestions only — SavourLife uses its own numbered breed list, so the box stays free text until we have it. */
export const BREED_SUGGESTIONS = [
  "Australian Cattle Dog",
  "Australian Kelpie",
  "Australian Shepherd",
  "Beagle",
  "Border Collie",
  "Boxer",
  "Bull Arab",
  "Cavoodle",
  "Chihuahua",
  "Cocker Spaniel",
  "Dachshund",
  "Staffordshire Bull Terrier",
  "Greyhound",
  "German Shepherd",
  "Golden Retriever",
  "Jack Russell Terrier",
  "Labrador Retriever",
  "Maltese",
  "Mastiff",
  "Pug",
  "Rottweiler",
  "Shih Tzu",
  "Staffy cross",
  "Terrier cross",
  "Mixed breed",
  "Unknown",
];

export type IntakeInput = {
  name: string;
  intakeDate: string;
  source: string;
  surrenderedBy: string;
  reason: string;
  reasonNote: string;
  breed: string;
  dateOfBirth: string;
  ageBand: string;
  sex: string;
  desexed: YN;
  colour: string;
  markings: string;
  coatLength: string;
  sizeWhenAdult: string;
  weightKg: string;
  microchip: string;
  condition: string;
  visibleInjuries: string;
  parasites: YN;
  vaccinationGiven: YN;
  vaccinationType: string;
  fleaTickWormGiven: YN;
  behaviour: string[];
  behaviourOther: string;
  experiencedOnly: boolean;
  goodWithKidsU5: string;
  goodWithKids5to12: string;
  goodWithCats: string;
  goodWithDogs: string;
  notes: string;
  officerName: string;
  signedName: string;
  /** Start on bed rest (not walkable yet) rather than Available. */
  startOnBedRest: boolean;
};

export const EMPTY_INTAKE: IntakeInput = {
  name: "",
  intakeDate: "",
  source: "",
  surrenderedBy: "",
  reason: "",
  reasonNote: "",
  breed: "",
  dateOfBirth: "",
  ageBand: "",
  sex: "",
  desexed: "",
  colour: "",
  markings: "",
  coatLength: "",
  sizeWhenAdult: "",
  weightKg: "",
  microchip: "",
  condition: "",
  visibleInjuries: "",
  parasites: "",
  vaccinationGiven: "",
  vaccinationType: "",
  fleaTickWormGiven: "",
  behaviour: [],
  behaviourOther: "",
  experiencedOnly: false,
  goodWithKidsU5: "untested",
  goodWithKids5to12: "untested",
  goodWithCats: "untested",
  goodWithDogs: "untested",
  notes: "",
  officerName: "",
  signedName: "",
  startOnBedRest: false,
};

/** The first thing missing on the form, or null. Mirrors the server check so the message appears on the page. */
export function intakeError(f: IntakeInput): string | null {
  if (!f.name.trim()) return "Please give the dog a name (or 'Unknown' with the date, e.g. Unknown 7 Oct).";
  if (!f.intakeDate) return "Please set the date of intake.";
  if (!f.source) return "Please choose where the dog came from.";
  if (!f.reason) return "Please choose the reason for intake.";
  if (!f.breed.trim()) return "Please enter a breed (or 'Unknown').";
  if (!f.dateOfBirth && !f.ageBand) return "Please give a date of birth, or pick an approximate age.";
  if (!f.sex) return "Please choose male or female.";
  if (!f.desexed) return "Please say whether the dog is desexed.";
  if (!f.condition) return "Please record the dog's condition.";
  if (!f.parasites) return "Please say whether parasites were seen.";
  if (!f.vaccinationGiven) return "Please say whether a vaccination was given.";
  if (f.vaccinationGiven === "yes" && !f.vaccinationType) return "Please choose the vaccination type.";
  if (!f.fleaTickWormGiven) return "Please say whether flea, tick or worm treatment was given.";
  if (f.behaviour.length === 0) return "Please pick at least one initial behaviour assessment.";
  if (f.behaviour.includes("other") && !f.behaviourOther.trim()) return "Please say what the other behaviour is.";
  if (!f.signedName.trim()) return "Please type your name to sign the intake record.";
  return null;
}

/** Estimated date of birth from an age band (midpoint), as YYYY-MM-DD. */
export function dobFromBand(band: string, today = new Date()): string | null {
  const b = AGE_BANDS.find(([k]) => k === band);
  if (!b) return null;
  const d = new Date(today);
  d.setMonth(d.getMonth() - b[2]);
  return d.toISOString().slice(0, 10);
}
