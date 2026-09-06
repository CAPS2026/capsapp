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
    </div>
  );
}
