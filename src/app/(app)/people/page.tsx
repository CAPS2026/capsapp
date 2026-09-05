import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";

export default async function PeoplePage() {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/dogs");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        People
      </h1>
      <p className="text-ink-muted text-sm mt-2">
        The people list + carer approval (docs/ui-flows.md §8) — coming soon.
      </p>
    </div>
  );
}
