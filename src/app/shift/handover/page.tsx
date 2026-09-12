import Link from "next/link";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getHandoverNotes } from "@/lib/shift-data";
import { redirect } from "next/navigation";
import { HandoverLog } from "@/components/shift/handover-log";

export default async function HandoverPage() {
  const active = await getActiveShiftPerson();
  if (!active) redirect("/shift");

  const notes = await getHandoverNotes();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 p-4 pb-10">
      <header className="flex items-center gap-3">
        <Link href="/shift" className="text-sm font-semibold text-brand-ink">
          ← Today
        </Link>
        <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Handover log
        </h1>
      </header>

      <HandoverLog notes={notes} />
    </div>
  );
}
