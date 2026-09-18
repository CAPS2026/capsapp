import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getRosterablePeople, getRosterEditRange } from "@/lib/shift-data";
import { shelterToday } from "@/lib/shift";
import { RosterEditForm } from "@/components/shift/roster-edit-form";

export default async function RosterEditPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; days?: string }>;
}) {
  const person = await getCurrentPerson();
  if (!person?.isAdmin) redirect("/shift/roster");

  const sp = await searchParams;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(sp.start ?? "") ? sp.start! : shelterToday();
  const days = Math.min(31, Math.max(1, Number(sp.days) || 14));

  const [people, rows] = await Promise.all([getRosterablePeople(), getRosterEditRange(start, days)]);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
          ← Roster
        </Link>
        <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Edit roster
        </h1>
      </header>

      <p className="text-xs leading-relaxed text-ink-muted">
        Select who is on for each shift, morning and afternoon. Remember to press the Save at the bottom
        before you exit this screen!
      </p>

      <RosterEditForm start={start} days={days} people={people} initialRows={rows} />
    </div>
  );
}
