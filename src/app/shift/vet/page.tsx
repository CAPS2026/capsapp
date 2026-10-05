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
      <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
        &larr; Roster
      </Link>
      <header
        className="flex flex-wrap items-center gap-3 rounded-[14px] px-[18px] py-3.5 text-white"
        style={{ background: "linear-gradient(90deg, #B0306A, #D2508A)" }}
      >
        {/* A stethoscope, for the vet. */}
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M5 3v6a5 5 0 0 0 10 0V3" />
          <path d="M10 14v2a5 5 0 0 0 10 0v-2" />
          <circle cx="20" cy="11" r="2.2" />
        </svg>
        <h1 className="m-0 text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Vet appointments
        </h1>
        <Link
          href="/shift/vet#add"
          className="ml-auto inline-flex h-12 items-center rounded-[var(--radius)] bg-[#F26B1D] px-6 text-base font-extrabold text-white"
        >
          Add appointment
        </Link>
      </header>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <VetList appts={appts} />
        <VetForm key={editing?.id ?? "new"} appt={editing ?? undefined} dogNames={dogNames} today={today} />
      </div>
    </div>
  );
}
