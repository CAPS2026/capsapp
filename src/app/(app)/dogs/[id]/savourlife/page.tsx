import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getDogForEdit } from "@/lib/dog-edit";
import { buildSavourLifeFields } from "@/lib/savourlife-sheet";
import { SavourLifeSheet } from "@/components/dogs/savourlife-sheet";
import { SavourLifeListingCard } from "@/components/dogs/savourlife-listing-card";
import type { SlStatus } from "@/lib/savourlife-status";
import { createClient } from "@/lib/supabase/server";

// A clean, copy-friendly page of everything SavourLife's "Add New Dog" form asks for, in
// their order, plus the photos ticked for SavourLife. Staff and admin only.
export default async function SavourLifeSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentPerson();
  if (!me?.isStaff) redirect(`/dogs/${id}`);

  const data = await getDogForEdit(id);
  if (!data) notFound();

  const supabase = await createClient();
  // select * so this keeps working before migration 47 adds the status columns
  const { data: dogRow } = await supabase.from("dogs").select("*").eq("id", id).maybeSingle();

  const fields = buildSavourLifeFields(data.initial);
  const photos = data.photos.filter((p) => p.slInclude).slice(0, 10);

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href={`/dogs/${id}`} className="text-sm font-semibold text-brand-ink">
          ← {data.initial.name}
        </Link>
        <Link href={`/dogs/${id}/edit`} className="text-sm font-semibold text-brand-ink underline">
          Edit dog / photos
        </Link>
      </div>
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        SavourLife details to transfer
      </h1>
      <SavourLifeListingCard
        dogId={id}
        current={{
          status: ((dogRow?.sl_status as SlStatus | undefined) ??
            (dogRow?.listed_on_savourlife ? "listed" : "not_listed")) as SlStatus,
          savourlifeId: (dogRow?.savourlife_id as number | null) ?? null,
          holdReason: (dogRow?.sl_hold_reason as string | null) ?? null,
          enquiryNumber: (dogRow?.sl_enquiry_number as string | null) ?? null,
          changedAt: (dogRow?.sl_status_changed_at as string | null) ?? null,
        }}
      />
      <SavourLifeSheet
        dogName={data.initial.name}
        dogRef={data.ref}
        fields={fields}
        photos={photos.map((p) => ({ path: p.path, url: p.url }))}
        savourlifeId={(dogRow?.savourlife_id as number | null) ?? null}
      />
    </div>
  );
}
