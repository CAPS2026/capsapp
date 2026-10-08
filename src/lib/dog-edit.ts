import { createClient } from "@/lib/supabase/server";
import { EMPTY_INTAKE, INTAKE_REASONS, type IntakeInput, type YN } from "@/lib/intake";

export type DogEditData = {
  dogId: string;
  ref: string;
  /** The dog has a paper intake record (dogs added before intake existed don't). */
  hasIntake: boolean;
  updatedAt: string | null;
  photos: { path: string; url: string }[];
  initial: IntakeInput;
};

const yn = (v: boolean | null | undefined): YN => (v === true ? "yes" : v === false ? "no" : "");
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** Everything the edit form needs, from the dog row plus its staff-only intake record and contact email. */
export async function getDogForEdit(dogId: string): Promise<DogEditData | null> {
  const supabase = await createClient();
  const { data: dog } = await supabase.from("dogs").select("*").eq("id", dogId).maybeSingle();
  if (!dog) return null;
  // Read tolerantly: dogs added before intake existed have no intake row.
  const [{ data: intake }, { data: conf }, { data: media }] = await Promise.all([
    supabase.from("dog_intake").select("*").eq("dog_id", dogId).maybeSingle(),
    supabase.from("dog_confidential").select("sl_contact_email").eq("dog_id", dogId).maybeSingle(),
    supabase.from("dog_media").select("path").eq("dog_id", dogId).order("sort_order"),
  ]);

  // The reason is stored as "Chosen reason — more detail": split it back into the dropdown and the note.
  const fullReason = str(intake?.reason);
  const chosen = INTAKE_REASONS.find((r) => fullReason === r || fullReason.startsWith(`${r} — `)) ?? "";
  const reasonNote = chosen ? fullReason.slice(chosen.length).replace(/^ — /, "") : fullReason;

  const initial: IntakeInput = {
    ...EMPTY_INTAKE,
    name: str(dog.name),
    breed: str(dog.breed),
    dateOfBirth: str(dog.date_of_birth),
    sex: str(dog.sex),
    sizeWhenAdult: str(dog.size_when_adult),
    coatLength: str(dog.coat_length),
    microchip: str(dog.microchip_no),
    description: str(dog.public_description),
    contactEmail: str((conf as { sl_contact_email?: string | null } | null)?.sl_contact_email),
    goodWithKidsU5: str(dog.good_with_kids_u5) || "untested",
    goodWithKids5to12: str(dog.good_with_kids_5_12) || "untested",
    goodWithCats: str(dog.good_with_cats) || "untested",
    goodWithDogs: str(dog.good_with_dogs) || "untested",
    goodWithOther: str(dog.good_with_other) || "untested",
    desexed: yn(dog.desexed),
    vaccinated: yn(dog.vaccinated),
    wormed: yn(dog.wormed),
    heartworm: yn(dog.heartworm_treated),
    medicalIssues: str(dog.public_medical_summary),
    specialNeeds: str(dog.special_needs),
    indoorOnly: yn(dog.indoor_only),
    bondedPair: yn(dog.bonded_pair) || "no",
    bondedPairName: str(dog.bonded_pair_name),
    suburb: str(dog.sl_suburb) || EMPTY_INTAKE.suburb,
    state: str(dog.sl_state) || EMPTY_INTAKE.state,
    postcode: str(dog.sl_postcode) || EMPTY_INTAKE.postcode,
    interstate: yn(dog.interstate_adoption),
    distance: str(dog.adoption_available_within) || "Unrestricted",
    adoptionFee: str(dog.adoption_fee),
    fosterRequired: yn(dog.foster_care_required),
    intakeDate: str(intake?.intake_date) || str(dog.arrival_date),
    colour: str(dog.colour),
    markings: str(dog.markings),
    weightKg: str(dog.weight_kg),
    source: str(dog.arrival_type),
    surrenderedBy: str(intake?.surrendered_by),
    reason: chosen,
    reasonNote,
    condition: str(intake?.condition),
    visibleInjuries: str(intake?.visible_injuries),
    parasites: yn(intake?.parasites_observed),
    vaccinationGiven: yn(intake?.vaccination_given),
    vaccinationType: str(intake?.vaccination_type),
    fleaTickWormGiven: yn(intake?.flea_tick_worm_given),
    behaviour: (intake?.behaviour_assessment as string[] | null) ?? [],
    behaviourOther: str(intake?.behaviour_other),
    experiencedOnly: !!dog.experienced_handler_only,
    notes: str(intake?.notes),
    officerName: str(intake?.intake_officer_name),
    signedName: str(intake?.signed_name),
  };

  return {
    dogId,
    ref: str(dog.ref),
    hasIntake: !!intake,
    updatedAt: (dog.updated_at as string | null) ?? null,
    photos: (media ?? []).map((m) => ({
      path: m.path as string,
      url: supabase.storage.from("dog-photos").getPublicUrl(m.path as string).data.publicUrl,
    })),
    initial,
  };
}
