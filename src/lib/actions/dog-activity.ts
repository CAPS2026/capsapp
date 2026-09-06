"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";

type ActionResult = { error: string } | { error?: undefined };

/** Postgres error -> a message a volunteer can actually act on. */
function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "This dog already has an open activity — refresh and try again.";
  return error.message;
}

/**
 * The one-tap fast path (docs/ui-flows.md §4): walk out, right now, with the
 * signed-in person as the walker. RLS (`da_insert`) is what actually enforces
 * "a volunteer can only log a walk for themselves" — this just supplies the
 * values; a rejected insert surfaces as a normal Postgres error.
 */
export async function startWalk(dogId: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("dog_activity").insert({
    dog_id: dogId,
    type: "walk",
    person_id: person.id,
    started_at: new Date().toISOString(),
  });

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${dogId}`);
  return {};
}

/**
 * The one-tap fast path (docs/ui-flows.md §5): closes whichever activity is
 * currently open for the dog. RLS (`da_update`) only allows this for staff or
 * the person the open activity belongs to.
 */
export async function bringDogIn(dogId: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dog_activity")
    .update({ ended_at: new Date().toISOString() })
    .eq("dog_id", dogId)
    .is("ended_at", null)
    .select("id");

  if (error) return { error: friendlyError(error) };
  if (!data || data.length === 0) return { error: "Nothing to bring in — no open activity for this dog." };

  revalidatePath("/dogs");
  revalidatePath(`/dogs/${dogId}`);
  return {};
}
