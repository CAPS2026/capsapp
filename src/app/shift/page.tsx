import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getOpenShift, getShiftChecklist, getTodayShiftPeople } from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { shelterToday } from "@/lib/shift";
import { PersonPicker } from "@/components/shift/person-picker";
import { ShiftChecklist } from "@/components/shift/shift-checklist";

export default async function ShiftPage() {
  // Independent, so together. (The open-shift lookup has to come after
  // the auto-close check, which may close it.)
  const [, active] = await Promise.all([checkAutoCloseAndSendEmails(), getActiveShiftPerson()]);

  const date = shelterToday();
  const openShift = active ? await getOpenShift(active.id) : null;

  // A cookie with nobody actually signed in behind it (shouldn't normally
  // happen, endShift clears it, but don't get stuck if it does) falls
  // back to the picker rather than showing a broken checklist.
  if (!active || !openShift) {
    const people = await getTodayShiftPeople(date);
    return <PersonPicker people={people} />;
  }

  // Only this shift's own tasks: the morning and afternoon lists are separate.
  const checklist = await getShiftChecklist(openShift.part);

  return (
    <ShiftChecklist byCategory={checklist.byCategory} carriedOver={checklist.carriedOver} extras={checklist.extras} />
  );
}
