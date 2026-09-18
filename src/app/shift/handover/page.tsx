import { redirect } from "next/navigation";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getHandoverNotes } from "@/lib/shift-data";
import { HandoverLog } from "@/components/shift/handover-log";

export default async function HandoverPage() {
  const active = await getActiveShiftPerson();
  if (!active) redirect("/shift");

  const notes = await getHandoverNotes();

  return (
    <div className="max-w-2xl">
      <HandoverLog notes={notes} />
    </div>
  );
}
