import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getPersonDetail } from "@/lib/person-detail";
import { EditPersonForm } from "@/components/people/edit-person-form";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentPerson();
  if (!viewer?.isStaff) redirect("/dogs");

  const person = await getPersonDetail(id);
  if (!person) notFound();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href={`/people/${id}`} className="text-sm font-semibold text-brand-ink">
        ← {person.firstName} {person.surname}
      </Link>
      <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Edit details
      </h1>
      <EditPersonForm person={person} />
    </div>
  );
}
