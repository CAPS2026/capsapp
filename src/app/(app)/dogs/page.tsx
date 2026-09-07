import { getCurrentPerson } from "@/lib/auth";
import { getDogsListData } from "@/lib/dogs-data";
import { DogsList } from "@/components/dogs/dogs-list";

// The status-grouped Dogs home base (docs/ui-flows.md §2), with the one-tap
// take-out/bring-in fast paths (§4/§5). The fuller wizard (other walker,
// other activity types, backdated entries) is still to come.
export default async function DogsPage() {
  const person = await getCurrentPerson();

  if (!person || !person.id) {
    return (
      <div className="p-6">
        <div className="rounded-[var(--radius)] border border-warm bg-warm-tint p-4 text-sm">
          Signed in as <strong>{person?.email}</strong>, but there&apos;s no CAPS
          registration on file for that email yet — nothing to show until a
          staff member links your account, or you register.
        </div>
      </div>
    );
  }

  const { dogs, statusMeta, orgSettings } = await getDogsListData();

  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Dogs
        </h1>
      </div>
      <DogsList
        dogs={dogs}
        statusMeta={statusMeta}
        orgSettings={orgSettings}
        currentPersonId={person.id}
        currentPersonName={`${person.firstName} ${person.surname}`.trim()}
        isStaff={person.isStaff}
      />
    </div>
  );
}
