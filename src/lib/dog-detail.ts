import { createClient } from "@/lib/supabase/server";
import type { DogStatus } from "@/lib/dogs";

type GoodWith = "yes" | "no" | "untested" | null;

export type DogDetail = {
  id: string;
  ref: string;
  name: string;
  status: DogStatus;
  handlingNotes: string | null;
  experiencedHandlerOnly: boolean;
  arrivalDate: string | null;
  breed: string | null;
  dateOfBirth: string | null;
  ageOverride: string | null;
  sex: string | null;
  sizeWhenAdult: string | null;
  colour: string | null;
  weightKg: number | null;
  desexed: boolean | null;
  vaccinated: boolean | null;
  wormed: boolean | null;
  heartwormTreated: boolean | null;
  goodWithKidsU5: GoodWith;
  goodWithKids5to12: GoodWith;
  goodWithCats: GoodWith;
  goodWithDogs: GoodWith;
  goodWithOther: GoodWith;
  energyLevel: string | null;
  houseTrained: string | null;
  publicDescription: string | null;
  publicMedicalSummary: string | null;
  adoptionFee: number | null;
  interstateAdoption: boolean | null;
  adoptionAvailableWithin: string | null;
  adoptionPolicy: string | null;
  binSourceNumber: string | null;
  savourlifeId: number | null;
  listedOnSavourlife: boolean;
  markings: string | null;
  coatLength: string | null;
  indoorOnly: boolean | null;
  fosterCareRequired: boolean | null;
  specialNeeds: string | null;
  bondedPair: boolean | null;
  bondedPairName: string | null;
  slSuburb: string | null;
  slState: string | null;
  slPostcode: string | null;
  photos: { path: string; url: string; isPrimary: boolean; caption: string | null }[];
};

export type DogIntake = {
  intakeDate: string;
  surrenderedBy: string | null;
  reason: string | null;
  condition: string | null;
  visibleInjuries: string | null;
  parasitesObserved: boolean | null;
  vaccinationGiven: boolean | null;
  vaccinationType: string | null;
  fleaTickWormGiven: boolean | null;
  behaviourAssessment: string[];
  behaviourOther: string | null;
  notes: string | null;
  officerName: string | null;
  signedName: string | null;
};

export type DogConfidential = {
  slContactEmail: string | null;
  behaviourNotes: string | null;
  adoptionHistory: string | null;
  medicalSummaryInternal: string | null;
  restrictions: string | null;
};

export type MedicalEvent = {
  id: string;
  eventDate: string;
  type: string;
  detail: string;
  vet: string | null;
};

type MedicalEventRow = {
  id: string;
  event_date: string;
  type: string;
  detail: string;
  vet: string | null;
};

export type ActivityEntry = {
  id: string;
  type: string;
  personId: string | null;
  personName: string | null;
  startedAt: string;
  endedAt: string | null;
  dueBack: string | null;
  reason: string | null;
  enteredLate: boolean;
  editedAt: string | null;
};

export type NoteEntry = {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  authorName: string | null;
};

export async function getDogDetail(dogId: string, isStaff: boolean) {
  const supabase = await createClient();

  const { data: dogRow, error: dogErr } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", dogId)
    .maybeSingle();
  if (dogErr) console.error("getDogDetail: dog lookup failed", dogErr);
  if (!dogRow) return null;

  // These four reads don't depend on each other — run them together.
  let notesQuery = supabase
    .from("notes")
    .select("id, body, visibility, created_at, author:people!notes_author_id_fkey(first_name, surname)")
    .eq("subject_type", "dog")
    .eq("subject_id", dogId)
    .order("created_at", { ascending: false });
  if (!isStaff) notesQuery = notesQuery.eq("visibility", "all");

  const [
    { data: mediaRows },
    { data: activityRows, error: activityErr },
    { data: noteRows, error: noteErr },
    { data: confidentialRow },
    { data: medicalRows },
    { data: intakeRow },
    { data: contactRow },
  ] = await Promise.all([
    supabase
      .from("dog_media")
      .select("path, is_primary, sort_order, caption")
      .eq("dog_id", dogId)
      .order("sort_order"),
    supabase
      .from("dog_activity")
      .select(
        "id, type, started_at, ended_at, due_back, reason, entered_late, edited_at, person:people!dog_activity_person_id_fkey(id, first_name, surname)",
      )
      .eq("dog_id", dogId)
      .order("started_at", { ascending: false })
      .limit(60),
    notesQuery,
    isStaff
      ? supabase
          .from("dog_confidential")
          .select("behaviour_notes, adoption_history, medical_summary_internal, restrictions")
          .eq("dog_id", dogId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    isStaff
      ? supabase
          .from("medical_events")
          .select("id, event_date, type, detail, vet")
          .eq("dog_id", dogId)
          .order("event_date", { ascending: false })
      : Promise.resolve({ data: [] as MedicalEventRow[] }),
    // Read separately and tolerantly: until migration 45 is applied these just come back empty.
    isStaff
      ? supabase.from("dog_intake").select("*").eq("dog_id", dogId).maybeSingle()
      : Promise.resolve({ data: null }),
    isStaff
      ? supabase.from("dog_confidential").select("sl_contact_email").eq("dog_id", dogId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (activityErr) console.error("getDogDetail: activity read failed", activityErr);
  if (noteErr) console.error("getDogDetail: notes read failed", noteErr);

  const photos = (mediaRows ?? []).map((m) => ({
    path: m.path,
    url: supabase.storage.from("dog-photos").getPublicUrl(m.path).data.publicUrl,
    isPrimary: m.is_primary,
    caption: m.caption,
  }));

  const dog: DogDetail = {
    id: dogRow.id,
    ref: dogRow.ref,
    name: dogRow.name,
    status: dogRow.status,
    handlingNotes: dogRow.handling_notes,
    experiencedHandlerOnly: dogRow.experienced_handler_only,
    arrivalDate: dogRow.arrival_date,
    breed: dogRow.breed,
    dateOfBirth: dogRow.date_of_birth,
    ageOverride: dogRow.age_override,
    sex: dogRow.sex,
    sizeWhenAdult: dogRow.size_when_adult,
    colour: dogRow.colour,
    weightKg: dogRow.weight_kg,
    desexed: dogRow.desexed,
    vaccinated: dogRow.vaccinated,
    wormed: dogRow.wormed,
    heartwormTreated: dogRow.heartworm_treated,
    goodWithKidsU5: dogRow.good_with_kids_u5,
    goodWithKids5to12: dogRow.good_with_kids_5_12,
    goodWithCats: dogRow.good_with_cats,
    goodWithDogs: dogRow.good_with_dogs,
    goodWithOther: dogRow.good_with_other,
    energyLevel: dogRow.energy_level,
    houseTrained: dogRow.house_trained,
    publicDescription: dogRow.public_description,
    publicMedicalSummary: dogRow.public_medical_summary,
    adoptionFee: dogRow.adoption_fee,
    interstateAdoption: dogRow.interstate_adoption,
    adoptionAvailableWithin: dogRow.adoption_available_within,
    adoptionPolicy: dogRow.adoption_policy,
    binSourceNumber: dogRow.bin_source_number,
    savourlifeId: dogRow.savourlife_id,
    listedOnSavourlife: dogRow.listed_on_savourlife,
    markings: dogRow.markings ?? null,
    coatLength: dogRow.coat_length ?? null,
    indoorOnly: dogRow.indoor_only ?? null,
    fosterCareRequired: dogRow.foster_care_required ?? null,
    specialNeeds: dogRow.special_needs ?? null,
    bondedPair: dogRow.bonded_pair ?? null,
    bondedPairName: dogRow.bonded_pair_name ?? null,
    slSuburb: dogRow.sl_suburb ?? null,
    slState: dogRow.sl_state ?? null,
    slPostcode: dogRow.sl_postcode ?? null,
    photos,
  };

  const c = confidentialRow as {
    behaviour_notes: string | null;
    adoption_history: string | null;
    medical_summary_internal: string | null;
    restrictions: string | null;
  } | null;
  const slContactEmail = (contactRow as { sl_contact_email?: string | null } | null)?.sl_contact_email ?? null;
  const ir = intakeRow as Record<string, unknown> | null;
  const intake: DogIntake | null = ir
    ? {
        intakeDate: ir.intake_date as string,
        surrenderedBy: (ir.surrendered_by as string | null) ?? null,
        reason: (ir.reason as string | null) ?? null,
        condition: (ir.condition as string | null) ?? null,
        visibleInjuries: (ir.visible_injuries as string | null) ?? null,
        parasitesObserved: (ir.parasites_observed as boolean | null) ?? null,
        vaccinationGiven: (ir.vaccination_given as boolean | null) ?? null,
        vaccinationType: (ir.vaccination_type as string | null) ?? null,
        fleaTickWormGiven: (ir.flea_tick_worm_given as boolean | null) ?? null,
        behaviourAssessment: (ir.behaviour_assessment as string[] | null) ?? [],
        behaviourOther: (ir.behaviour_other as string | null) ?? null,
        notes: (ir.notes as string | null) ?? null,
        officerName: (ir.intake_officer_name as string | null) ?? null,
        signedName: (ir.signed_name as string | null) ?? null,
      }
    : null;
  const confidential: DogConfidential | null = c || slContactEmail
    ? {
        slContactEmail,
        behaviourNotes: c?.behaviour_notes ?? null,
        adoptionHistory: c?.adoption_history ?? null,
        medicalSummaryInternal: c?.medical_summary_internal ?? null,
        restrictions: c?.restrictions ?? null,
      }
    : null;

  const medicalEvents: MedicalEvent[] = ((medicalRows ?? []) as MedicalEventRow[]).map((e) => ({
    id: e.id,
    eventDate: e.event_date,
    type: e.type,
    detail: e.detail,
    vet: e.vet,
  }));

  const allActivities: ActivityEntry[] = ((activityRows ?? []) as unknown as Array<{
    id: string;
    type: string;
    started_at: string;
    ended_at: string | null;
    due_back: string | null;
    reason: string | null;
    entered_late: boolean;
    edited_at: string | null;
    person: { id: string; first_name: string; surname: string } | null;
  }>).map((a) => ({
    id: a.id,
    type: a.type,
    personId: a.person?.id ?? null,
    personName: a.person ? `${a.person.first_name} ${a.person.surname}` : null,
    startedAt: a.started_at,
    endedAt: a.ended_at,
    dueBack: a.due_back,
    reason: a.reason,
    enteredLate: a.entered_late,
    editedAt: a.edited_at,
  }));

  const currentActivity = allActivities.find((a) => !a.endedAt) ?? null;

  const latestOfEachType = (["walk", "yard", "bed_rest", "jail_break", "foster"] as const).map((type) => ({
    type,
    entry: allActivities.find((a) => a.type === type) ?? null,
  }));

  const notes: NoteEntry[] = ((noteRows ?? []) as unknown as Array<{
    id: string;
    body: string;
    visibility: string;
    created_at: string;
    author: { first_name: string; surname: string } | null;
  }>).map((n) => ({
    id: n.id,
    body: n.body,
    visibility: n.visibility,
    createdAt: n.created_at,
    authorName: n.author ? `${n.author.first_name} ${n.author.surname}` : null,
  }));

  return { dog, confidential, intake, medicalEvents, activityLog: allActivities, currentActivity, latestOfEachType, notes };
}
