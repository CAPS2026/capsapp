// Who may approve or decline pending roles (homecare, under-18 consent).
// Admin AND named in org_settings.approver_person_ids (migration 42). If the
// list is empty or the column doesn't exist yet, any admin can — so nothing
// locks up before the SQL has been run. Reads with the service role because
// org_settings is staff-only to read and this must work for any caller.
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentPerson } from "@/lib/auth";

export async function canApprove(person: Pick<CurrentPerson, "id" | "isAdmin"> | null): Promise<boolean> {
  if (!person?.id || !person.isAdmin) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.from("org_settings").select("approver_person_ids").maybeSingle();
  if (error) {
    // 42703 = column not there yet: fall back to any admin.
    if (error.code !== "42703") console.error("canApprove failed", error);
    return true;
  }
  const ids = (data?.approver_person_ids as string[] | null | undefined) ?? [];
  return ids.length === 0 || ids.includes(person.id);
}
