import Link from "next/link";
import { getCurrentPerson } from "@/lib/auth";
import {
  getOpenSiteVisits,
  getTodaySiteVisits,
  listSiteVisitReasons,
} from "@/lib/site-visits-data";
import { SiteVisitBoard } from "@/components/site/site-visit-board";
import { TodayVisits } from "@/components/site/today-visits";
import { SignInDialog } from "@/components/site/sign-in-dialog";

// Who's on site now, the day's log, and sign-in/out (docs/ui-flows.md §9).
export default async function SitePage() {
  const [person, visits, today, reasons] = await Promise.all([
    getCurrentPerson(),
    getOpenSiteVisits(),
    getTodaySiteVisits(),
    listSiteVisitReasons(),
  ]);

  return (
    <div className="p-4 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Site
        </h1>
        <SignInDialog reasons={reasons} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Here now</h2>
        <SiteVisitBoard visits={visits} />
      </div>

      <TodayVisits visits={today} isStaff={Boolean(person?.isStaff)} />

      {/* Where a new walk-up gets the registration form — they fill it in
          themselves. This is the surface the shared shelter iPad shows. */}
      <Link
        href="/apply/volunteer"
        className="flex items-center justify-between gap-3 bg-card border border-line rounded-[var(--radius)] p-3 text-sm font-semibold text-brand-ink"
      >
        New volunteer? Open the registration form
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
