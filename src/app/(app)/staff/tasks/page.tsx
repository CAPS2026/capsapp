import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getTaskTemplates } from "@/lib/staff-data";
import { TemplateManager } from "@/components/staff/template-manager";

export default async function RecurringTasksPage() {
  const person = await getCurrentPerson();
  if (!person?.isAdmin) redirect("/staff");

  const templates = await getTaskTemplates();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <Link href="/staff" className="text-sm font-semibold text-brand-ink">
        ← Staff
      </Link>
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Recurring tasks
      </h1>
      <p className="text-sm text-ink-muted">
        These generate automatically each day they&rsquo;re due. Ad-hoc one-off tasks are added
        on the day itself.
      </p>
      <TemplateManager templates={templates} />
    </div>
  );
}
