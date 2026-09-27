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
      <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
        &larr; Roster
      </Link>
      <header
        className="flex flex-wrap items-center gap-3 rounded-[14px] px-[18px] py-3.5 text-white"
        style={{ background: "linear-gradient(90deg, #B0306A, #D2508A)" }}
      >
        {/* A capsule, for medications. */}
        <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
          <g transform="rotate(-40 12 12)">
            <rect x="3" y="8.5" width="18" height="7" rx="3.5" fill="#fff" />
            <rect x="12" y="8.5" width="9" height="7" rx="3.5" fill="#F7C6DA" />
            <rect x="11" y="8.5" width="2" height="7" fill="#F7C6DA" />
          </g>
        </svg>
        <h1 className="m-0 text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Medications
        </h1>
        <Link
          href="/shift/medications#add"
          className="ml-auto inline-flex h-12 items-center rounded-[var(--radius)] bg-[#F26B1D] px-6 text-base font-extrabold text-white"
        >
          Add medication
        </Link>
      </header>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <MedicationList meds={meds} />
        <MedicationForm key={editing?.id ?? "new"} med={editing ?? undefined} dogNames={dogNames} />
      </div>
    </div>
  );
}
