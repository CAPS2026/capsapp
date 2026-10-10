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

/** Where the dog starts. Anything but Available starts that placement straight away (with its due-back time). */
export const START_STATUSES: [string, string][] = [
  ["available", "Available"],
  ["bed_rest", "Bed rest"],
  ["yard", "Yard"],
  ["foster", "Foster"],
  ["jail_break", "Jail break"],
];

export const YARD_CHOICES = ["Yard 1", "Yard 2"];

/** SavourLife's distance restriction choices. */
export const DISTANCE_OPTIONS = ["Unrestricted", "20 km", "40 km", "60 km", "100 km", "200 km", "500 km"];

export const AU_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"];

/** CAPS's own location, the default for every listing (20 Kerr Point Drive, Evans Landing). */
export const CAPS_LOCATION = { suburb: "Weipa", state: "QLD", postcode: "4874" };

export type IntakeInput = {
  // ---- SavourLife profile (SL) — in the order SavourLife's form asks ----
  name: string;
  breed: string;
  dateOfBirth: string;
  ageBand: string;
  sex: string;
  sizeWhenAdult: string;
  coatLength: string;
  microchip: string;
  description: string;
  contactEmail: string;
  goodWithKidsU5: string;
  goodWithKids5to12: string;
  goodWithCats: string;
  goodWithDogs: string;
  goodWithOther: string;
  desexed: YN;
  vaccinated: YN;
  wormed: YN;
  heartworm: YN;
  medicalIssues: string;
  specialNeeds: string;
  indoorOnly: YN;
  bondedPair: YN;
  bondedPairName: string;
  suburb: string;
  state: string;
  postcode: string;
  interstate: YN;
  distance: string;
  adoptionFee: string;
  fosterRequired: YN;
  // ---- CAPS intake record (from the paper form) ----
  intakeDate: string;
  colour: string;
  markings: string;
  weightKg: string;
  source: string;
  surrenderedBy: string;
  reason: string;
  reasonNote: string;
  condition: string;
  visibleInjuries: string;
  parasites: YN;
  vaccinationGiven: YN;
  vaccinationType: string;
  fleaTickWormGiven: YN;
  behaviour: string[];
  behaviourOther: string;
  experiencedOnly: boolean;
  notes: string;
  officerName: string;
  signedName: string;
  /** Where the dog starts: available, or a placement that needs a due-back time. */
  startStatus: string;
  /** Foster / jail break carer (a person id). */
  startPersonId: string;
  /** Local "YYYY-MM-DDTHH:mm" in the form; an ISO time once it reaches the server. */
  startDueBack: string;
  startYard: string;
  /** Bed rest: why. Foster / jail break: any note. */
  startNotes: string;
};

export const EMPTY_INTAKE: IntakeInput = {
  name: "",
  breed: "",
  dateOfBirth: "",
  ageBand: "",
  sex: "",
  sizeWhenAdult: "",
  coatLength: "",
  microchip: "",
  description: "",
  contactEmail: "",
  goodWithKidsU5: "untested",
  goodWithKids5to12: "untested",
  goodWithCats: "untested",
  goodWithDogs: "untested",
  goodWithOther: "untested",
  desexed: "",
  vaccinated: "",
  wormed: "",
  heartworm: "",
  medicalIssues: "",
  specialNeeds: "",
  indoorOnly: "",
  bondedPair: "no",
  bondedPairName: "",
  suburb: CAPS_LOCATION.suburb,
  state: CAPS_LOCATION.state,
  postcode: CAPS_LOCATION.postcode,
  interstate: "",
  distance: "Unrestricted",
  adoptionFee: "",
  fosterRequired: "",
  intakeDate: "",
  colour: "",
  markings: "",
  weightKg: "",
  source: "",
  surrenderedBy: "",
  reason: "",
  reasonNote: "",
  condition: "",
  visibleInjuries: "",
  parasites: "",
  vaccinationGiven: "",
  vaccinationType: "",
  fleaTickWormGiven: "",
  behaviour: [],
  behaviourOther: "",
  experiencedOnly: false,
  notes: "",
  officerName: "",
  signedName: "",
  startStatus: "available",
  startPersonId: "",
  startDueBack: "",
  startYard: "Yard 1",
  startNotes: "",
};

/** One thing wrong on the form: which field (its key on IntakeInput, or a group name) and what to tell the person. */
export type Issue = { key: string; message: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** SavourLife profile checks (staff can edit these any time). Returns every problem, not just the first. */
export function profileIssues(f: IntakeInput): Issue[] {
  const out: Issue[] = [];
  if (!f.name.trim()) out.push({ key: "name", message: "Name — give the dog a name (or 'Unknown' with the date)." });
  if (!f.breed.trim()) out.push({ key: "breed", message: "Breed — enter a breed (or 'Unknown')." });
  if (!f.sex) out.push({ key: "sex", message: "Sex — choose male or female." });
  if (!f.dateOfBirth && !f.ageBand)
    out.push({ key: "dateOfBirth", message: "Date of birth — enter it, or pick an approximate age." });
  if (!f.desexed) out.push({ key: "desexed", message: "Desexed — say yes or no." });
  if (f.bondedPair === "yes" && !f.bondedPairName.trim())
    out.push({ key: "bondedPairName", message: "Bonded with — say who the dog is bonded with." });
  if (!f.postcode.trim()) out.push({ key: "postcode", message: "Postcode — needed for the SavourLife listing." });
  if (!f.adoptionFee.trim() || !Number.isFinite(parseFloat(f.adoptionFee)))
    out.push({ key: "adoptionFee", message: "Adoption fee — SavourLife needs one (enter 0 if there is none)." });
  if (f.contactEmail.trim() && !EMAIL_RE.test(f.contactEmail.trim()))
    out.push({ key: "contactEmail", message: "Case manager email — doesn't look right." });
  return out;
}

/** The starting-placement answers, when the dog doesn't start as Available. */
export function placementIssues(f: IntakeInput): Issue[] {
  if (f.startStatus === "available") return [];
  const out: Issue[] = [];
  if ((f.startStatus === "foster" || f.startStatus === "jail_break") && !f.startPersonId)
    out.push({ key: "startPersonId", message: "Carer — pick who the dog is going to." });
  if (!f.startDueBack) out.push({ key: "startDueBack", message: "Due back — say when the dog is due back." });
  else if (Number.isNaN(new Date(f.startDueBack).getTime()))
    out.push({ key: "startDueBack", message: "Due back — enter a valid date and time." });
  else if (new Date(f.startDueBack) <= new Date())
    out.push({ key: "startDueBack", message: "Due back — must be in the future." });
  if (f.startStatus === "bed_rest" && !f.startNotes.trim())
    out.push({ key: "startNotes", message: "Notes — say why the dog is on bed rest." });
  return out;
}

/** The paper intake record's required answers (admin). */
export function recordIssues(f: IntakeInput): Issue[] {
  const out: Issue[] = [];
  if (!f.intakeDate) out.push({ key: "intakeDate", message: "Date of intake — set the date." });
  if (!f.source) out.push({ key: "source", message: "Source of intake — where did the dog come from?" });
  if (!f.reason) out.push({ key: "reason", message: "Reason for intake — choose one." });
  if (!f.condition) out.push({ key: "condition", message: "Condition — record the dog's condition." });
  if (!f.parasites) out.push({ key: "parasites", message: "Parasites seen? — say yes or no." });
  if (!f.vaccinationGiven) out.push({ key: "vaccinationGiven", message: "Vaccination given? — say yes or no." });
  else if (f.vaccinationGiven === "yes" && !f.vaccinationType)
    out.push({ key: "vaccinationType", message: "Vaccination type — choose one." });
  if (!f.fleaTickWormGiven)
    out.push({ key: "fleaTickWormGiven", message: "Flea / tick / worm given? — say yes or no." });
  if (f.behaviour.length === 0)
    out.push({ key: "behaviour", message: "Behaviour assessment — tick at least one." });
  else if (f.behaviour.includes("other") && !f.behaviourOther.trim())
    out.push({ key: "behaviourOther", message: "What other behaviour? — say what you saw." });
  return out;
}

export function signoffIssues(f: IntakeInput): Issue[] {
  return f.signedName.trim() ? [] : [{ key: "signedName", message: "Signed — type your name to sign the record." }];
}

/** Every problem a new intake has, in the order the form shows the fields. */
export function intakeIssues(f: IntakeInput): Issue[] {
  const order = ["intakeDate", "startStatus", "startPersonId", "startYard", "startDueBack", "startNotes"];
  const placement = [...recordIssues(f).filter((i) => i.key === "intakeDate"), ...placementIssues(f)].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
  const record = recordIssues(f).filter((i) => i.key !== "intakeDate");
  return [...placement, ...profileIssues(f), ...record, ...signoffIssues(f)];
}

// Server checks and the older callers want just the first message.
const firstMessage = (list: Issue[]) => list[0]?.message.replace(/^[^—]+— /, "") ?? null;
export const profileError = (f: IntakeInput) => firstMessage(profileIssues(f));
export const placementError = (f: IntakeInput) => firstMessage(placementIssues(f));
export const recordError = (f: IntakeInput) => firstMessage(recordIssues(f));
export const signoffError = (f: IntakeInput) => firstMessage(signoffIssues(f));
/** Everything a new intake needs. Mirrors the server check. */
export const intakeError = (f: IntakeInput) => firstMessage(intakeIssues(f));

/** Estimated date of birth from an age band (midpoint), as YYYY-MM-DD. */
export function dobFromBand(band: string, today = new Date()): string | null {
  const b = AGE_BANDS.find(([k]) => k === band);
  if (!b) return null;
  const d = new Date(today);
  d.setMonth(d.getMonth() - b[2]);
  return d.toISOString().slice(0, 10);
}
