"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";
import { submitHomecareApplication, type HomecareApplicationInput } from "@/lib/homecare-apply-core";

/**
 * Staff-started jail break / foster application for someone already on the
 * books (the "Add jail break / foster carer" choice in Update status). Same
 * outcome as the public form: pending role(s), a homecare profile, and the
 * approval emails. Staff only. Overwrites the home details on file (the form
 * is pre-filled with what we already hold, so staff are correcting it).
 */
export async function applyForHomecare(
  personId: string,
  input: HomecareApplicationInput,
): Promise<{ error: string } | { error?: undefined }> {
  const me = await getCurrentPerson();
  if (!me?.isStaff || !me.id) return { error: "Staff only." };

  const result = await submitHomecareApplication(createAdminClient(), personId, input, { fillBlanksOnly: false });
  if (result.error) return result;

  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
  return {};
}
