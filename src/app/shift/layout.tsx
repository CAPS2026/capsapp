import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { ensureRosterSession, getHandoverNotes, getOpenShift, getRosterDayDetail, getShiftSettings } from "@/lib/shift-data";
import { shelterToday } from "@/lib/shift";
import { ShiftSidebar } from "@/components/shift/shift-sidebar";
import { ShiftTabs } from "@/components/shift/shift-tabs";

// Overrides the root layout's manifest for everything under /shift, so
// this installs to the tablet's home screen as its own "CAPS Staff" icon,
// separate from "CAPS App" (the dog side). Same login underneath either
// way. Next.js merges metadata down the tree; a field set here wins over
// the root layout's for this subtree without touching that file.
export const metadata: Metadata = {
  title: "CAPS Staff",
  description: "Shift sign-in, checklist and handover.",
  manifest: "/shift-manifest.json",
};

/** Landscape tablet layout (the office device sits landscape, on a stand):
 *  a fixed sidebar with identity, shift status and the latest handover
 *  note, next to whichever tab's content is showing. The sidebar only
 *  appears once someone's actually signed in, nobody picked yet means no
 *  shift status to show, so it stays out of the way rather than sitting
 *  there saying "nobody signed in" next to the exact screen that fixes
 *  that. The tab bar stays up regardless, so navigation always works. */
export default async function ShiftLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();
  if (!person?.isStaff) {
    const pathname = (await headers()).get("x-pathname") ?? "/shift";
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const active = await getActiveShiftPerson();
  const [openShift, settings, notes, todayRoster] = await Promise.all([
    active ? getOpenShift(active.id) : Promise.resolve(null),
    getShiftSettings(),
    getHandoverNotes(1),
    getRosterDayDetail(shelterToday()),
  ]);
  const session = openShift ? await ensureRosterSession(openShift.date, openShift.part) : null;

  return (
    <div className="flex min-h-screen bg-paper">
      {active && openShift && session && (
        <ShiftSidebar
          person={active}
          shift={openShift}
          sessionEnds={session.ends}
          autocloseGraceMinutes={settings.autocloseGraceMinutes}
          latestHandover={notes[0] ? { personName: notes[0].personName, body: notes[0].body } : null}
          todayRoster={todayRoster}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <ShiftTabs />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
