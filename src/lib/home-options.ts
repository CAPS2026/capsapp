// Fixed answer lists for the home-and-garden questions, shared by the public
// form, the staff homecare form and the home check so they all say the same
// thing. Fence and ownership lists follow the original paper form
// ("CAPS Foster & Jail Break Program"). Heights carry their units because a
// bare "6" could be feet or metres.

export const OTHER = "Other";

export const OWNERSHIP_TYPES = ["Homeowner", "Renting"];

export const FENCE_TYPES = ["Colour Bond", "Mesh / Banksia panel", "Timber", OTHER];

export const FENCE_HEIGHTS = ["Standard (900 mm – 1200 mm)", "6 ft (about 1.8 m)", OTHER];

export const PET_TYPES = ["Dog", "Cat", "Bird", "Horse", "Rabbit / guinea pig", "Reptile", "Farm animal", OTHER];

export const TEMPERAMENTS = [
  "Friendly with other animals",
  "Gentle but shy",
  "Playful / energetic",
  "Dominant / bossy",
  "Can be aggressive",
  "Not sure",
];

export const YES_NO: [string, string][] = [
  ["yes", "Yes"],
  ["no", "No"],
];

/** 1 to 9, then "10 or more". Values stay numeric strings. */
export const PEOPLE_AT_HOME: [string, string][] = [
  ...Array.from({ length: 9 }, (_, i): [string, string] => [String(i + 1), String(i + 1)]),
  ["10", "10 or more"],
];

/** 0 to 5, then "6 or more". */
export const CHILDREN: [string, string][] = [
  ...Array.from({ length: 5 }, (_, i): [string, string] => [String(i), i === 0 ? "None" : String(i)]),
  ["6", "6 or more"],
];

/** 0 to 9, then "10 or more" — how many other animals. */
export const ANIMAL_COUNTS: [string, string][] = [
  ...Array.from({ length: 10 }, (_, i): [string, string] => [String(i), i === 0 ? "None" : String(i)]),
  ["10", "10 or more"],
];

export const CHILD_AGES: [string, string][] = Array.from({ length: 16 }, (_, i): [string, string] => [
  String(i),
  i === 0 ? "Under 1" : String(i),
]);
