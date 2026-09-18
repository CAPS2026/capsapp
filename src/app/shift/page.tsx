import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getOpenShift, getShiftChecklist, getTodayShiftPeople } from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { shelterToday } from "@/lib/shift";
import { PersonPicker } from "@/components/shift/person-picker";
import { ShiftChecklist } from "@/components/shift/shift-checklist";

export default async function ShiftPage() {
  await checkAutoCloseAndSendEmails();

  const date = shelterToday();
  const active = await getActiveShiftPerson();
  const openShift = active ? await getOpenShift(active.id) : null;

  // A cookie with nobody actually signed in behind it (shouldn't normally
  // happen, endShift clears it, but don't get stuck if it does) falls
  // back to the picker rather than showing a broken checklist.
  if (!active || !openShift) {
    const people = await getTodayShiftPeople(date);
    return <PersonPicker people={people} />;
  }

  const checklist = await getShiftChecklist();

  return (
    <ShiftChecklist byCategory={checklist.byCategory} carriedOver={checklist.carriedOver} extras={checklist.extras} />
  );
}
