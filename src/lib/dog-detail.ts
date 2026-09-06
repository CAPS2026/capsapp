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
  photos: { path: string; url: string; isPrimary: boolean; caption: string | null }[];
};

export type DogConfidential = {
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

export type ActivityEntry = {
  id: string;
  type: string;
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

  const { data: dogRow } = await supabase.from("dogs").select("*").eq("id", dogId).maybeSingle();
  if (!dogRow) return null;

  const { data: mediaRows } = await supabase
    .from("dog_media")
    .select("path, is_primary, sort_order, caption")
    .eq("dog_id", dogId)
    .order("sort_order");

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
    photos,
  };

  let confidential: DogConfidential | null = null;
  let medicalEvents: MedicalEvent[] = [];

  if (isStaff) {
    const { data: c } = await supabase
      .from("dog_confidential")
      .select("behaviour_notes, adoption_history, medical_summary_internal, restrictions")
      .eq("dog_id", dogId)
      .maybeSingle();
    confidential = c
      ? {
          behaviourNotes: c.behaviour_notes,
          adoptionHistory: c.adoption_history,
          medicalSummaryInternal: c.medical_summary_internal,
          restrictions: c.restrictions,
        }
      : null;

    const { data: m } = await supabase
      .from("medical_events")
      .select("id, event_date, type, detail, vet")
      .eq("dog_id", dogId)
      .order("event_date", { ascending: false });
    medicalEvents = (m ?? []).map((e) => ({
      id: e.id,
      eventDate: e.event_date,
      type: e.type,
      detail: e.detail,
      vet: e.vet,
    }));
  }

  const { data: activityRows } = await supabase
    .from("dog_activity")
    .select(
      "id, type, started_at, ended_at, due_back, reason, entered_late, edited_at, person:people!dog_activity_person_id_fkey(first_name, surname)",
    )
    .eq("dog_id", dogId)
    .order("started_at", { ascending: false })
    .limit(20);

  const activities: ActivityEntry[] = ((activityRows ?? []) as unknown as Array<{
    id: string;
    type: string;
    started_at: string;
    ended_at: string | null;
    due_back: string | null;
    reason: string | null;
    entered_late: boolean;
    edited_at: string | null;
    person: { first_name: string; surname: string } | null;
  }>).map((a) => ({
    id: a.id,
    type: a.type,
    personName: a.person ? `${a.person.first_name} ${a.person.surname}` : null,
    startedAt: a.started_at,
    endedAt: a.ended_at,
    dueBack: a.due_back,
    reason: a.reason,
    enteredLate: a.entered_late,
    editedAt: a.edited_at,
  }));

  const latestOfEachType = (["walk", "yard", "bed_rest", "foster"] as const).map((type) => ({
    type,
    entry: activities.find((a) => a.type === type || (type === "foster" && a.type === "jail_break")) ?? null,
  }));

  let notesQuery = supabase
    .from("notes")
    .select("id, body, visibility, created_at, author:people!notes_author_id_fkey(first_name, surname)")
    .eq("subject_type", "dog")
    .eq("subject_id", dogId)
    .order("created_at", { ascending: false });
  if (!isStaff) notesQuery = notesQuery.eq("visibility", "all");
  const { data: noteRows } = await notesQuery;

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

  return { dog, confidential, medicalEvents, activities: activities.slice(0, 5), latestOfEachType, notes };
}
