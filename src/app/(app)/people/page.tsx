import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getPeopleList } from "@/lib/people-data";
import { PeopleList } from "@/components/people/people-list";

export default async function PeoplePage() {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/dogs");

  const people = await getPeopleList();
  const pendingCount = people.filter((p) => p.hasPending).length;

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          People
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {people.length} registered
          {pendingCount > 0 ? ` · ${pendingCount} awaiting approval` : ""}
        </p>
      </div>

      <PeopleList people={people} />
    </div>
  );
}
