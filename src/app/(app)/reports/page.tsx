import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";

export default async function ReportsPage() {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/dogs");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Reports
      </h1>
      <p className="text-ink-muted text-sm mt-2">
        Needs-a-walk, currently-out, walk activity, length of stay, homecare
        load, intake/exit (docs/ui-flows.md §11) — coming soon.
      </p>
    </div>
  );
}
