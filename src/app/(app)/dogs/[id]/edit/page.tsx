import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getDogForEdit } from "@/lib/dog-edit";
import { IntakeForm } from "@/components/intake/intake-form";
import { PhotoManager } from "@/components/dogs/photo-manager";
import { formatDate } from "@/lib/format";

// Edit a dog's details at any time. Staff can change the SavourLife profile; the
// signed paper intake record is editable by admins only (the sign-off itself never changes here).
export default async function EditDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentPerson();
  if (!me?.isStaff) redirect(`/dogs/${id}`);

  const data = await getDogForEdit(id);
  if (!data) notFound();

  const showRecord = me.isAdmin && data.hasIntake;

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 max-w-4xl mx-auto w-full">
      <Link href={`/dogs/${id}`} className="text-sm font-semibold text-brand-ink">
        ← {data.initial.name}
      </Link>
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Edit {data.initial.name} <span className="text-base font-normal text-ink-muted">{data.ref}</span>
      </h1>
      {data.updatedAt && <p className="text-xs text-ink">Last saved {formatDate(data.updatedAt)}.</p>}
      {!showRecord && (
        <p className="text-sm text-ink bg-gray-tint rounded-[var(--radius)] p-3">
          {data.hasIntake
            ? "You can edit the SavourLife profile. The signed intake record can only be changed by an admin."
            : "This dog was added before the intake screen existed, so there is no intake record — you can edit the SavourLife profile."}
        </p>
      )}
      <PhotoManager dogId={id} dogName={data.initial.name} photos={data.photos} />
      <IntakeForm
        officerName={`${me.firstName} ${me.surname}`.trim()}
        today=""
        edit={{ dogId: id, initial: data.initial, showRecord }}
      />
    </div>
  );
}
