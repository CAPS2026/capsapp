import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getDogDetail } from "@/lib/dog-detail";
import { DogDetailView } from "@/components/dogs/dog-detail-view";

// Read-only dog detail card (docs/ui-flows.md §3). Take-out/bring-in, add-note
// and edit actions are the next build slices per §15.
export default async function DogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getCurrentPerson();
  if (!person || !person.id) notFound();

  const detail = await getDogDetail(id, person.isStaff);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href="/dogs" className="text-sm font-semibold text-brand-ink">
        ← Dogs
      </Link>
      <DogDetailView {...detail} isStaff={person.isStaff} />
    </div>
  );
}
