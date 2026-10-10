import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getHandoverNotes, getHealthConcerns } from "@/lib/shift-data";
import { HandoverLog } from "@/components/shift/handover-log";
import { HealthConcernsList } from "@/components/shift/health-concerns-list";

export default async function HandoverPage() {
  const [active, me] = await Promise.all([getActiveShiftPerson(), getCurrentPerson()]);
  // Caretakers pick their name first. Admins (on their own phone or
  // computer) can come straight here to see and deal with health concerns.
  if (!active && !me?.isAdmin) redirect("/shift");

  const [notes, concerns] = await Promise.all([getHandoverNotes(), getHealthConcerns()]);
  // Notes ticked off more than 3 days ago are folded away.
  const foldBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <HealthConcernsList concerns={concerns} isAdmin={me?.isAdmin ?? false} />
      <HandoverLog notes={notes} foldBefore={foldBefore} />
    </div>
  );
}
