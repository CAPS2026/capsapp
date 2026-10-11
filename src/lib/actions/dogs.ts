"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";

type Result = { error: string } | { error?: undefined };

/**
 * Permanently delete a dog and everything about it — activity, notes,
 * medical events, confidential record, photos. Admin only, no undo.
 * Mostly for clearing test rows or a mistaken entry; a real dog that has
 * left should be given `status = 'exited'` instead.
 */
export async function deleteDog(dogId: string): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) return { error: "Admin only." };

  const admin = createAdminClient();

  // dog_activity.dog_id blocks a delete; clear it first. dog_confidential /
  // dog_media / medical_events cascade on their own, and
  // dogs.current_activity_id / latest_*_id are ON DELETE SET NULL so they
  // clear when the activity rows go. `notes` is polymorphic with no FK, so
  // it wouldn't block the delete — but tidy up the orphans anyway.
  await admin.from("notes").delete().eq("subject_type", "dog").eq("subject_id", dogId);
  await admin.from("dog_activity").delete().eq("dog_id", dogId);

  const { error } = await admin.from("dogs").delete().eq("id", dogId);
  if (error) return { error: error.message };

  revalidatePath("/dogs");
  return {};
}

export type ExitDogInput = {
  exitType: "adopted" | "transferred" | "reclaimed" | "death";
  exitDate: string; // yyyy-mm-dd
  notes: string;
  /** Adopter, or whoever reclaimed the dog. */
  personId: string | null;
  /** SavourLife enquiry number for an adoption. */
  enquiryNumber: string;
};

/**
 * The dog has left CAPS. Sets status 'exited' (the list hides exited dogs; the sync trigger
 * leaves 'exited' alone) and records date, type, notes and who took the dog. A dog that is
 * still out (walk, yard, bed rest, jail break, foster) must be brought back first.
 */
export async function exitDog(dogId: string, input: ExitDogInput): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };
  if (!["adopted", "transferred", "reclaimed", "death"].includes(input.exitType))
    return { error: "Choose why the dog is leaving." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.exitDate)) return { error: "Enter the date the dog left." };
  if (input.exitType === "adopted" && !input.personId) return { error: "Choose who adopted the dog." };

  const supabase = await createClient();
  const { data: dog } = await supabase.from("dogs").select("status, sl_status").eq("id", dogId).maybeSingle();
  if (!dog) return { error: "Dog not found." };
  if (dog.status === "exited") return { error: "This dog has already been exited." };
  if (dog.status !== "available")
    return { error: "This dog is still out — bring them back (or end the stay) before exiting them." };

  const enquiry = input.exitType === "adopted" ? input.enquiryNumber.trim() || null : null;
  const markSl = input.exitType === "adopted" && (dog.sl_status === "listed" || dog.sl_status === "on_hold");

  const { error } = await supabase
    .from("dogs")
    .update({
      status: "exited",
      exit_date: input.exitDate,
      exit_type: input.exitType,
      exit_notes: input.notes.trim() || null,
      exit_person_id: input.exitType === "adopted" || input.exitType === "reclaimed" ? input.personId : null,
      ...(markSl
        ? { sl_status: "adopted", sl_enquiry_number: enquiry, sl_status_changed_at: new Date().toISOString(), listed_on_savourlife: false }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", dogId);
  if (error) {
    const missing = error.code === "42703" || /column/i.test(error.message);
    return { error: missing ? "Apply migration 49 in Supabase first, then try again." : error.message };
  }

  revalidatePath("/dogs");
  revalidatePath("/dogs/exited");
  revalidatePath(`/dogs/${dogId}`);
  return {};
}

/** Undo an exit (a mistake, or a dog that came back). The dog returns to Available. */
export async function reinstateDog(dogId: string): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dogs")
    .update({
      status: "available",
      exit_date: null,
      exit_type: null,
      exit_notes: null,
      exit_person_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dogId)
    .eq("status", "exited");
  if (error) return { error: error.message };

  revalidatePath("/dogs");
  revalidatePath("/dogs/exited");
  revalidatePath(`/dogs/${dogId}`);
  return {};
}
