"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";

type ActionResult = { error: string } | { error?: undefined };

/** Anyone registered, for the sign-in person picker (docs/ui-flows.md §9). */
export async function listAllPeople(): Promise<{ id: string; name: string }[]> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, surname")
    .order("first_name");
  if (error) console.error("listAllPeople failed", error);

  return (data ?? []).map((p) => ({ id: p.id, name: `${p.first_name} ${p.surname}` }));
}

export async function signIntoSite(input: {
  personId: string | null;
  guestName: string;
  guestPhone: string;
  reason: string;
  reasonOther: string;
}): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };
  if (!input.personId && !input.guestName.trim()) return { error: "Pick a person or enter a guest name." };
  if (input.reason === "other" && !input.reasonOther.trim()) return { error: "Say what the reason is." };

  const supabase = await createClient();
  const { error } = await supabase.from("site_visits").insert({
    person_id: input.personId,
    guest_name: input.personId ? null : input.guestName.trim(),
    guest_phone: input.personId ? null : input.guestPhone.trim() || null,
    reason: input.reason,
    reason_other: input.reason === "other" ? input.reasonOther.trim() : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/site");
  return {};
}

export async function signOutOfSite(id: string): Promise<ActionResult> {
  const person = await getCurrentPerson();
  if (!person || !person.id) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_visits")
    .update({ checked_out: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/site");
  return {};
}
