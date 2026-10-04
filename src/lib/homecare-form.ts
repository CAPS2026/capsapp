// Client-safe shape of the "home details" part of a homecare application,
// shared by the staff form, the public homecare form and the registration
// form's homecare section.

export type HomeDetails = {
  propertyOwnership: string;
  fenceType: string;
  fenceHeight: string;
  peopleAtHome: string;
  childrenU16: string;
  otherAnimals: string;
  animalDetails: string;
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
  otherAnimals: "",
  animalDetails: "",
  vaccines: "",
  jbDay: false,
  jbWeekend: false,
  jbShift: false,
  jbSchool: false,
  fosterShort: false,
  fosterLong: false,
};

/** What the server actions take: the form's home details, flattened. */
export function homePayload(h: HomeDetails) {
  return {
    propertyOwnership: h.propertyOwnership,
    fenceType: h.fenceType,
    fenceHeight: h.fenceHeight,
    peopleAtHome: h.peopleAtHome,
    childrenU16: h.childrenU16,
    otherAnimals: h.otherAnimals,
    animalDetails: h.animalDetails,
    vaccinesCurrent: h.vaccines === "" ? null : h.vaccines === "yes",
    jbDay: h.jbDay,
    jbWeekend: h.jbWeekend,
    jbShift: h.jbShift,
    jbSchool: h.jbSchool,
    fosterShort: h.fosterShort,
    fosterLong: h.fosterLong,
  };
}
