"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSE_LINK_DAYS, courseLinkExpired } from "@/lib/medication-link";
import { shelterToday } from "@/lib/shift";

type Result = { error?: string };

/** Stop a medication from the link in the "course finished?" email. The
 *  person is not logged in, so this uses the service-role client and the
 *  unguessable token is the only key. The link only works once a caretaker
 *  has flagged the course as finished, and for COURSE_LINK_DAYS after that.
 *  Nothing happens on opening the page, only on pressing the button, so a
 *  mail scanner pre-fetching the link can't stop anything. Same effect as
 *  Stop on the Medications page: it ends today and past doses stay on record. */
export async function stopMedicationByToken(token: string): Promise<Result> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "This link isn't valid." };
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: med } = await admin
    .from("medication")
    .select("id, stopped_at, finish_flagged_at")
    .eq("token", token)
    .maybeSingle();
  if (!med || !med.finish_flagged_at) return { error: "This link isn't valid." };
  if (med.stopped_at) return { error: "That medication has already been stopped." };
  if (courseLinkExpired(med.finish_flagged_at as string)) {
    return {
      error: `This link has expired (links work for ${COURSE_LINK_DAYS} days). Please stop it on the Medications page in the staff app.`,
    };
  }
  const { data, error } = await admin
    .from("medication")
    .update({ stopped_at: new Date().toISOString(), end_date: shelterToday() })
    .eq("token", token)
    .is("stopped_at", null)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "That medication has already been stopped." };
  revalidatePath("/shift");
  revalidatePath("/shift/medications");
  return {};
}
