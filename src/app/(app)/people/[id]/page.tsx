import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getPersonDetail } from "@/lib/person-detail";
import { getMergeCandidates } from "@/lib/people-data";
import { PersonDetailView } from "@/components/people/person-detail-view";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentPerson();
  if (!viewer?.isStaff) redirect("/dogs");

  const [person, mergeCandidates] = await Promise.all([
    getPersonDetail(id),
    getMergeCandidates(id),
  ]);
  if (!person) notFound();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href="/people" className="text-sm font-semibold text-brand-ink">
        ← People
      </Link>
      <PersonDetailView
        person={person}
        mergeCandidates={mergeCandidates}
        viewerIsAdmin={viewer.isAdmin}
      />
    </div>
  );
}
