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
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 p-4 pb-10">
      <header className="flex items-center gap-3">
        <Link href="/shift/roster" className="text-sm font-semibold text-brand-ink">
          ← Roster
        </Link>
        <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Edit roster
        </h1>
      </header>

      <p className="text-xs leading-relaxed text-ink-muted">
        Pick who&rsquo;s on for each day below, morning and afternoon. Leave a dropdown on
        &ldquo;Nobody rostered&rdquo; if it&rsquo;s genuinely unstaffed. Nothing here is saved until you press
        Save at the bottom.
      </p>

      <RosterEditForm start={start} days={days} people={people} initialRows={rows} />
    </div>
  );
}
