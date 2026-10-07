"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { HEALTH_LINK_DAYS, healthLinkExpired } from "@/lib/health-link";

type Result = { error?: string };

/** Who pressed the link. It is only ever sent to the health concern
 *  recipients, so when there is exactly one (Shayna) it was her. With
 *  several, or no matching person, nobody can be named, so it says "the email
 *  link" rather than guess. */
async function emailRecipientName(admin: SupabaseClient): Promise<string> {
  const fallback = "the email link";
  const { data: settings } = await admin.from("org_settings").select("health_concern_email_recipients").maybeSingle();
  const recipients = (settings?.health_concern_email_recipients ?? []) as string[];
  if (recipients.length !== 1) return fallback;
  const { data: person } = await admin
    .from("people")
    .select("first_name, surname")
    .ilike("email", recipients[0])
    .limit(2);
  if (!person || person.length !== 1) return fallback;
  return `${person[0].first_name} ${person[0].surname}`.trim() || fallback;
}

/** Mark a health concern as dealt with from the link in its email. The
 *  person is not logged in, so this uses the service-role client and the
 *  unguessable token is the only key. Nothing happens on opening the link,
 *  only on pressing the button, so a mail scanner pre-fetching it can't
 *  change anything. Only an open concern can be marked, so a second click
 *  changes nothing. */
export async function resolveHealthConcernByToken(token: string, note: string): Promise<Result> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "This link isn't valid." };
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: existing } = await admin
    .from("health_concern")
    .select("id, created_at")
    .eq("token", token)
    .maybeSingle();
  if (!existing) return { error: "This link isn't valid." };
  if (healthLinkExpired(existing.created_at as string)) {
    return {
      error: `This link has expired (links work for ${HEALTH_LINK_DAYS} days). Please mark it as dealt with on the Handover log tab in the staff app.`,
    };
  }
  const { data, error } = await admin
    .from("health_concern")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by_name: await emailRecipientName(admin),
      resolved_note: note.trim() || null,
    })
    .eq("token", token)
    .is("resolved_at", null)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "That concern has already been marked as dealt with." };
  revalidatePath("/shift/handover");
  return {};
}
