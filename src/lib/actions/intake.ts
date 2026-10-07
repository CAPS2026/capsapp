"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { AGE_BANDS, dobFromBand, intakeError, INTAKE_REASONS, INTAKE_SOURCES, type IntakeInput, type YN } from "@/lib/intake";

type Result = { error: string } | { ok: true; dogId: string; ref: string; error?: undefined };

const clean = (s: string) => s.trim();
const orNull = (s: string) => (s.trim() ? s.trim() : null);
const yn = (v: YN): boolean | null => (v === "yes" ? true : v === "no" ? false : null);
const untested = (v: string) => (v === "yes" || v === "no" || v === "untested" ? v : "untested");

/** Next dog reference, D001-style: one past the highest existing number. */
async function nextRef(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data } = await supabase.from("dogs").select("ref");
  let max = 0;
  for (const r of data ?? []) {
    const m = /^D(\d+)$/.exec((r.ref as string) ?? "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `D${String(max + 1).padStart(3, "0")}`;
}

/** Record a new dog from the intake screen. Staff only. Creates the dog and its intake record together. */
export async function createDogIntake(input: IntakeInput): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return { error: "Staff only." };

  const problem = intakeError(input);
  if (problem) return { error: problem };
  if (!INTAKE_SOURCES.some(([v]) => v === input.source)) return { error: "Please choose where the dog came from." };
  if (!INTAKE_REASONS.includes(input.reason)) return { error: "Please choose the reason for intake." };

  const supabase = await createClient();

  // A dog entered twice in a row is the usual mistake: same name taken in on the same day.
  const { data: same } = await supabase
    .from("dogs")
    .select("ref")
    .ilike("name", clean(input.name))
    .eq("arrival_date", input.intakeDate)
    .limit(1);
  if (same && same.length > 0) {
    return { error: `${clean(input.name)} was already taken in on that date (${same[0].ref}). Open that dog instead.` };
  }

  const dob = input.dateOfBirth || dobFromBand(input.ageBand);
  const bandLabel = input.dateOfBirth ? null : (AGE_BANDS.find(([k]) => k === input.ageBand)?.[1] ?? null);
  const behaviourText = input.behaviour
    .map((b) => (b === "other" ? clean(input.behaviourOther) : b))
    .filter(Boolean)
    .join(", ");
  const arrivalNotes = [clean(input.reason), clean(input.reasonNote), input.surrenderedBy.trim() && `Surrendered by ${clean(input.surrenderedBy)}`]
    .filter(Boolean)
    .join(" — ");
  const weight = parseFloat(input.weightKg);

  const ref = await nextRef(supabase);
  const { data: dog, error: dogErr } = await supabase
    .from("dogs")
    .insert({
      ref,
      name: clean(input.name),
      status: input.startOnBedRest ? "bed_rest" : "available",
      arrival_date: input.intakeDate,
      arrival_type: input.source,
      arrival_notes: arrivalNotes || null,
      breed: clean(input.breed),
      date_of_birth: dob,
      age_override: bandLabel ? `About ${bandLabel.toLowerCase()}` : null,
      sex: input.sex,
      size_when_adult: orNull(input.sizeWhenAdult),
      colour: orNull(input.colour),
      markings: orNull(input.markings),
      coat_length: orNull(input.coatLength),
      weight_kg: Number.isFinite(weight) ? weight : null,
      microchip_no: orNull(input.microchip),
      desexed: yn(input.desexed),
      vaccinated: input.vaccinationGiven === "yes" ? true : null,
      wormed: input.fleaTickWormGiven === "yes" ? true : null,
      experienced_handler_only: input.experiencedOnly,
      handling_notes: behaviourText ? `Intake assessment: ${behaviourText}.` : null,
      good_with_kids_u5: untested(input.goodWithKidsU5),
      good_with_kids_5_12: untested(input.goodWithKids5to12),
      good_with_cats: untested(input.goodWithCats),
      good_with_dogs: untested(input.goodWithDogs),
    })
    .select("id")
    .single();
  if (dogErr || !dog) {
    const missing = dogErr?.code === "42703" || /column/i.test(dogErr?.message ?? "");
    return { error: missing ? "Couldn't save the dog - has migration 45 been applied in Supabase?" : (dogErr?.message ?? "Couldn't save the dog.") };
  }

  const { error: intakeErr } = await supabase.from("dog_intake").insert({
    dog_id: dog.id,
    intake_date: input.intakeDate,
    surrendered_by: orNull(input.surrenderedBy),
    reason: [clean(input.reason), clean(input.reasonNote)].filter(Boolean).join(" — "),
    condition: input.condition,
    visible_injuries: orNull(input.visibleInjuries),
    parasites_observed: yn(input.parasites),
    vaccination_given: yn(input.vaccinationGiven),
    vaccination_type: input.vaccinationGiven === "yes" ? orNull(input.vaccinationType) : null,
    flea_tick_worm_given: yn(input.fleaTickWormGiven),
    behaviour_assessment: input.behaviour,
    behaviour_other: input.behaviour.includes("other") ? orNull(input.behaviourOther) : null,
    notes: orNull(input.notes),
    intake_officer_id: me.id,
    intake_officer_name: orNull(input.officerName) ?? `${me.firstName} ${me.surname}`.trim(),
    signed_name: clean(input.signedName),
  });
  if (intakeErr) {
    // Don't leave a half-entered dog behind.
    await supabase.from("dogs").delete().eq("id", dog.id);
    return { error: `Couldn't save the intake record (${intakeErr.message}). Has migration 45 been applied?` };
  }

  revalidatePath("/dogs");
  return { ok: true, dogId: dog.id as string, ref };
}
