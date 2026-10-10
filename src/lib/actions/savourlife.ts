"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/auth";
import { SL_HOLD_REASONS, SL_STATUSES, type SlStatus } from "@/lib/savourlife-status";

type Result = { error: string } | { ok: true; error?: undefined };

/**
 * Record where a dog stands on SavourLife. SavourLife isn't connected to this app, so this is
 * a record staff update after listing / holding / marking adopted / removing the dog there.
 */
export async function updateSavourLifeListing(
  dogId: string,
  input: { status: SlStatus; savourlifeId: string; holdReason: string; enquiryNumber: string },
): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };
  if (!SL_STATUSES.some((s) => s.code === input.status)) return { error: "Choose a status." };

  const idText = input.savourlifeId.trim();
  const id = idText ? Number(idText) : null;
  if (idText && (!Number.isInteger(id) || (id as number) <= 0)) return { error: "SavourLife ID should be a number." };
  if (input.status !== "not_listed" && !id)
    return { error: "Enter the SavourLife ID — SavourLife gives it to you once the dog is loaded." };
  if (input.status === "on_hold" && !SL_HOLD_REASONS.includes(input.holdReason))
    return { error: "Choose why the dog is on hold." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dogs")
    .update({
      sl_status: input.status,
      savourlife_id: id,
      sl_hold_reason: input.status === "on_hold" ? input.holdReason : null,
      sl_enquiry_number: input.status === "adopted" ? input.enquiryNumber.trim() || null : null,
      sl_status_changed_at: new Date().toISOString(),
      // The older yes/no flag stays in step: live or paused both mean the dog has a listing.
      listed_on_savourlife: input.status === "listed" || input.status === "on_hold",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dogId);
  if (error) {
    const missing = error.code === "42703" || /column/i.test(error.message);
    return { error: missing ? "Apply migration 47 in Supabase first, then try again." : error.message };
  }

  revalidatePath(`/dogs/${dogId}`);
  revalidatePath(`/dogs/${dogId}/savourlife`);
  return { ok: true };
}
