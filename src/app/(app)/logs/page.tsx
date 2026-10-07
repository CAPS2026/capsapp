import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getLog, getLogFilterOptions } from "@/lib/logs-data";
import { isLogTab, LEGACY_TAB_TYPES, type LogTab } from "@/lib/logs";
import { LogsView } from "@/components/logs/logs-view";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const person = await getCurrentPerson();
  if (!person?.isStaff) redirect("/dogs");

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const rawTab = one(sp.tab);
  const tab: LogTab = isLogTab(rawTab) ? rawTab : "activity";
  // Old per-type tab links open All activity with that type's chip on.
  const legacyTypes = rawTab ? LEGACY_TAB_TYPES[rawTab] : undefined;
  const filters = {
    from: one(sp.from),
    to: one(sp.to),
    dogId: one(sp.dog),
    personId: one(sp.person),
    types: legacyTypes ?? (one(sp.types) ?? "").split(",").filter(Boolean),
    status: one(sp.status) === "open" || one(sp.status) === "closed" ? (one(sp.status) as "open" | "closed") : undefined,
    flag: one(sp.flag) === "late" || one(sp.flag) === "edited" ? (one(sp.flag) as "late" | "edited") : undefined,
    q: one(sp.q),
  };

  const [data, options] = await Promise.all([getLog(tab, filters), getLogFilterOptions()]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Logs
      </h1>
      <Suspense fallback={null}>
        <LogsView tab={tab} data={data} options={options} />
      </Suspense>
    </div>
  );
}
