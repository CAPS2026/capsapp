import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getAllDogNames, getMedication, listMedications } from "@/lib/care-data";
import { MedicationForm, MedicationList } from "@/components/shift/care-admin";

/** Admins only: every dog's current medications, with add, edit and stop.
 *  Caretakers see the doses on their checklist, not this page. */
export default async function MedicationsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/shift/roster");
  const sp = await searchParams;
  const [meds, dogNames, editing] = await Promise.all([
    listMedications(),
    getAllDogNames(),
    sp.edit ? getMedication(sp.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
          &larr; Roster
        </Link>
        <h1 className="m-0 text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Medications
        </h1>
      </header>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <MedicationList meds={meds} />
        <MedicationForm key={editing?.id ?? "new"} med={editing ?? undefined} dogNames={dogNames} />
      </div>
    </div>
  );
}
