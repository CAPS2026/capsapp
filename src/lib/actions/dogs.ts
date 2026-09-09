"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";

type Result = { error: string } | { error?: undefined };

/**
 * Permanently delete a dog and everything about it — activity, notes,
 * medical events, confidential record, photos. Staff only, no undo.
 * Mostly for clearing test rows or a mistaken entry; a real dog that has
 * left should be given `status = 'exited'` instead.
 */
export async function deleteDog(dogId: string): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };

  const admin = createAdminClient();

  // notes.dog_id and dog_activity.dog_id block a delete; clear them first.
  // dog_confidential / dog_media / medical_events cascade on their own, and
  // dogs.current_activity_id / latest_*_id are ON DELETE SET NULL so they
  // clear when the activity rows go.
  await admin.from("notes").delete().eq("dog_id", dogId);
  await admin.from("dog_activity").delete().eq("dog_id", dogId);

  const { error } = await admin.from("dogs").delete().eq("id", dogId);
  if (error) return { error: error.message };

  revalidatePath("/dogs");
  return {};
}
