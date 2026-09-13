import { getActiveShiftPerson } from "@/lib/shift-identity";
import {
  ensureRosterSession,
  getOpenShift,
  getShiftChecklist,
  getShiftSettings,
  getTodayShiftPeople,
} from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { shelterToday } from "@/lib/shift";
import { PersonPicker } from "@/components/shift/person-picker";
import { ShiftHome } from "@/components/shift/shift-home";

export default async function ShiftPage() {
  await checkAutoCloseAndSendEmails();

  const date = shelterToday();
  const active = await getActiveShiftPerson();
  const openShift = active ? await getOpenShift(active.id) : null;

  // A cookie with nobody actually signed in behind it (shouldn't normally
  // happen, endShift clears it, but don't get stuck if it does) falls
  // back to the picker rather than showing a broken shift card.
  if (!active || !openShift) {
    const people = await getTodayShiftPeople(date);
    return <PersonPicker people={people} />;
  }

  const [checklist, session, settings] = await Promise.all([
    getShiftChecklist(),
    ensureRosterSession(openShift.date, openShift.part),
    getShiftSettings(),
  ]);

  return (
    <ShiftHome
      person={active}
      shift={openShift}
      sessionEnds={session.ends}
      autocloseGraceMinutes={settings.autocloseGraceMinutes}
      byCategory={checklist.byCategory}
      carriedOver={checklist.carriedOver}
      extras={checklist.extras}
    />
  );
}
