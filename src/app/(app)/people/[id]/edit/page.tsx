import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getPersonDetail } from "@/lib/person-detail";
import { personPhotoUrl } from "@/lib/people";
import { EditPersonForm } from "@/components/people/edit-person-form";
import { PersonPhotoField } from "@/components/people/person-photo-field";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentPerson();
  if (!viewer?.isStaff) redirect("/dogs");

  const person = await getPersonDetail(id);
  if (!person) notFound();

  const initials =
    `${person.firstName.charAt(0)}${person.surname.charAt(0)}`.toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href={`/people/${id}`} className="text-sm font-semibold text-brand-ink">
        ← {person.firstName} {person.surname}
      </Link>
      <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Edit details
      </h1>

      <section className="bg-card border border-line rounded-[var(--radius)] p-4 flex flex-col gap-2">
        <h2 className="font-bold">Photo</h2>
        <PersonPhotoField
          personId={person.id}
          photoUrl={personPhotoUrl(person.photoPath, person.photoVersion)}
          initials={initials}
        />
      </section>

      <EditPersonForm person={person} />
    </div>
  );
}
