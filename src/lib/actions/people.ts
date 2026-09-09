"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";

type Result = { error: string } | { error?: undefined };

const today = () => new Date().toISOString().slice(0, 10);

async function requireStaff() {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return null;
  return me;
}

function revalidate(personId: string) {
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}

/** Move a pending role to active (docs/ui-flows.md §8 — approve). */
export async function approveRole(personRoleId: string, personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("person_roles")
    .update({ status: "active", approved_by: me.id, granted_on: today() })
    .eq("id", personRoleId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidate(personId);
  return {};
}

export async function declineRole(personRoleId: string, personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("person_roles")
    .update({ status: "declined", approved_by: me.id, ended_on: today() })
    .eq("id", personRoleId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidate(personId);
  return {};
}

/**
 * No dedicated archive column yet — "archive" just ends every live role so
 * the person drops off the rosters and pickers. Restore brings the
 * volunteer role back active; carer roles come back as pending so they
 * re-run approval.
 */
export async function archivePerson(personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("person_roles")
    .update({ status: "exited", ended_on: today() })
    .eq("person_id", personId)
    .in("status", ["active", "pending"]);

  if (error) return { error: error.message };
  revalidate(personId);
  return {};
}

export async function restorePerson(personId: string): Promise<Result> {
  const me = await requireStaff();
  if (!me) return { error: "Staff only." };

  const supabase = await createClient();

  const { error: volErr } = await supabase
    .from("person_roles")
    .update({ status: "active", granted_on: today(), ended_on: null })
    .eq("person_id", personId)
    .eq("status", "exited")
    .eq("role", "volunteer");
  if (volErr) return { error: volErr.message };

  const { error: carerErr } = await supabase
    .from("person_roles")
    .update({ status: "pending", ended_on: null })
    .eq("person_id", personId)
    .eq("status", "exited")
    .in("role", ["jailbreak_carer", "foster_carer"]);
  if (carerErr) return { error: carerErr.message };

  revalidate(personId);
  return {};
}
