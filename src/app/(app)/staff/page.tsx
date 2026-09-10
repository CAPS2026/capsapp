import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getRosterDay, getRosterablePeople, getTasksForDay } from "@/lib/staff-data";
import { shelterToday } from "@/lib/staff";
import { DayNav } from "@/components/staff/day-nav";
import { RosterSection } from "@/components/staff/roster-section";
import { TasksSection } from "@/components/staff/tasks-section";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/dogs");

  const sp = await searchParams;
  const today = shelterToday();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : today;

  const [sessions, tasks, rosterable] = await Promise.all([
    getRosterDay(date),
    getTasksForDay(date),
    person.isAdmin ? getRosterablePeople() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-5 p-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Staff
        </h1>
        {person.isAdmin && (
          <Link href="/staff/tasks" className="text-sm font-semibold text-brand-ink">
            Recurring tasks →
          </Link>
        )}
      </div>

      <DayNav date={date} today={today} />

      <RosterSection
        date={date}
        sessions={sessions}
        rosterable={rosterable}
        isAdmin={person.isAdmin}
      />

      <TasksSection
        date={date}
        today={today}
        tasks={tasks}
        isAdmin={person.isAdmin}
      />
    </div>
  );
}
