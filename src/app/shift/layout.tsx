import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/auth";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getLeaveNoticesForShift } from "@/lib/leave-data";
import { ensureRosterSession, getHealthWatch, getOpenShift, getRosterDayDetail, getShiftSettings } from "@/lib/shift-data";
import { getOpenHandoverCount, getVetAppointments, getVolunteerCount } from "@/lib/care-data";
import { sessionInstant, shelterToday } from "@/lib/shift";
import { LateReasonGate } from "@/components/shift/late-reason-gate";
import { ReopenedGate } from "@/components/shift/reopened-gate";
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
  // Independent lookups, run together (each is a network round trip and
  // this layout re-renders on every tick).
  const [person, active] = await Promise.all([getCurrentPerson(), getActiveShiftPerson()]);
  if (!person?.isStaff) {
    const pathname = (await headers()).get("x-pathname") ?? "/shift";
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const today = shelterToday();
  const [openShift, settings, openHandoverCount, todayRoster, vetToday] = await Promise.all([
    active ? getOpenShift(active.id) : Promise.resolve(null),
    getShiftSettings(),
    getOpenHandoverCount(),
    getRosterDayDetail(today),
    getVetAppointments(today, today),
  ]);
  const [session, leaveNotices, volunteerCount, healthWatch] = await Promise.all([
    openShift ? ensureRosterSession(openShift.date, openShift.part) : Promise.resolve(null),
    openShift ? getLeaveNoticesForShift(openShift.id) : Promise.resolve([]),
    openShift ? getVolunteerCount(openShift.date, openShift.part) : Promise.resolve(null),
    openShift ? getHealthWatch({ date: openShift.date, part: openShift.part }) : Promise.resolve([]),
  ]);

  // Anyone else rostered on the same session as the person signed in.
  let alsoOn: string[] = [];
  if (active && openShift) {
    const detail = openShift.date === today ? todayRoster : await getRosterDayDetail(openShift.date);
    const sess = detail.find((s) => s.part === openShift.part);
    alsoOn = (sess?.attendees ?? []).filter((a) => a.id !== active.id).map((a) => a.first);
  }


  // Late by more than the grace period and no reason given yet: the reason
  // is required, so a prompt covers the screen until it's given.
  const lateReasonOwed =
    openShift !== null &&
    openShift.lateMinutes !== null &&
    openShift.lateMinutes > settings.lateAfterMinutes &&
    !openShift.lateReason;

  // Reopened after being closed automatically, and no extra time on record
  // yet: they are working past the finish, so say how much longer and why.
  const reopenedOwed =
    openShift !== null &&
    session !== null &&
    openShift.reopenedAt !== null &&
    openShift.extendedMinutes === null &&
    Date.now() > sessionInstant(openShift.date, session.ends).getTime();

  return (
    <div className="flex min-h-screen bg-background">
      {active && openShift && session && lateReasonOwed && (
        <LateReasonGate
          personName={active.name}
          part={openShift.part}
          lateMinutes={openShift.lateMinutes as number}
          starts={session.starts}
        />
      )}
      {active && openShift && session && reopenedOwed && (
        <ReopenedGate
          personName={active.name}
          part={openShift.part}
          ends={session.ends}
          endsAtIso={sessionInstant(openShift.date, session.ends).toISOString()}
        />
      )}
      {active && openShift && session && (
        <ShiftSidebar
          person={active}
          shift={openShift}
          session={{ starts: session.starts, ends: session.ends }}
          alsoOn={alsoOn}
          autocloseGraceMinutes={settings.autocloseGraceMinutes}
          lateAfterMinutes={settings.lateAfterMinutes}
          volunteerCount={volunteerCount}
          vetToday={vetToday}
          healthWatch={healthWatch}
          openHandoverCount={openHandoverCount}
          todayRoster={todayRoster}
          leaveNotices={leaveNotices}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <ShiftTabs />
        <main className="flex-1 overflow-y-auto border-t border-line bg-background p-4 md:px-[18px] md:pb-6 md:pt-3.5">
          {children}
        </main>
      </div>
    </div>
  );
}
