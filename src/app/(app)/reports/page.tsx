import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getReports } from "@/lib/reports-data";
import { ReportsView } from "@/components/reports/reports-view";

export default async function ReportsPage() {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/dogs");

  const reports = await getReports();

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Reports
      </h1>
      <ReportsView reports={reports} />
    </div>
  );
}
