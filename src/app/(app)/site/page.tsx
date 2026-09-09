import Link from "next/link";
import { getOpenSiteVisits, listSiteVisitReasons } from "@/lib/site-visits-data";
import { SiteVisitBoard } from "@/components/site/site-visit-board";
import { SignInDialog } from "@/components/site/sign-in-dialog";

// Who's on site now, and sign-in/out (docs/ui-flows.md §9).
export default async function SitePage() {
  const [visits, reasons] = await Promise.all([getOpenSiteVisits(), listSiteVisitReasons()]);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Site
        </h1>
        <SignInDialog reasons={reasons} />
      </div>
      <SiteVisitBoard visits={visits} />

      {/* Where a new walk-up gets the registration form — they fill it in
          themselves. This is the surface the shared shelter iPad shows. */}
      <Link
        href="/apply/volunteer"
        className="mt-2 flex items-center justify-between gap-3 bg-card border border-line rounded-[var(--radius)] p-3 text-sm font-semibold text-brand-ink"
      >
        New volunteer? Open the registration form
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
