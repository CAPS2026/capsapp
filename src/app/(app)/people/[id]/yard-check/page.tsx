import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getPersonDetail } from "@/lib/person-detail";
import { YardCheckForm } from "@/components/people/yard-check-form";

export default async function YardCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentPerson();
  if (!viewer?.isStaff) redirect("/dogs");

  const person = await getPersonDetail(id);
  if (!person) notFound();

  const hp = person.homecareProfile;

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href={`/people/${id}`} className="text-sm font-semibold text-brand-ink">
        ← {person.firstName} {person.surname}
      </Link>
      <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Yard check
      </h1>
      <YardCheckForm
        personId={id}
        personName={`${person.firstName} ${person.surname}`}
        initial={{
          propertyOwnership: hp?.propertyOwnership ?? null,
          fenceType: hp?.fenceType ?? null,
          fenceHeight: hp?.fenceHeight ?? null,
          peopleAtHome: hp?.peopleAtHome ?? null,
          childrenU16: hp?.childrenU16 ?? null,
          otherAnimals: hp?.otherAnimals ?? null,
          animalDetails: hp?.animalDetails ?? null,
          vaccinesCurrent: hp?.vaccinesCurrent ?? null,
          notes: hp?.yardCheckNotes ?? null,
        }}
      />
    </div>
  );
}
