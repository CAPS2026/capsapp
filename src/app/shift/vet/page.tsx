import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getAllDogNames, getVetAppointment, getVetAppointments } from "@/lib/care-data";
import { shelterToday, shiftDay } from "@/lib/shift";
import { VetForm, VetList } from "@/components/shift/care-admin";

/** Admins only: vet appointments coming up (the next three months), with
 *  add, edit and delete. Everyone sees them on the roster calendar, the
 *  shift card and the checklist. */
export default async function VetPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await getCurrentPerson();
  if (!me?.isAdmin) redirect("/shift/roster");
  const sp = await searchParams;
  const today = shelterToday();
  const [appts, dogNames, editing] = await Promise.all([
    getVetAppointments(today, shiftDay(today, 92)),
    getAllDogNames(),
    sp.edit ? getVetAppointment(sp.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
          &larr; Roster
        </Link>
        <h1 className="m-0 text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Vet appointments
        </h1>
      </header>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <VetList appts={appts} />
        <VetForm key={editing?.id ?? "new"} appt={editing ?? undefined} dogNames={dogNames} today={today} />
      </div>
    </div>
  );
}
