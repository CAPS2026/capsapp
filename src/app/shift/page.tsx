import { getCurrentPerson } from "@/lib/auth";
import { getActiveShiftPerson } from "@/lib/shift-identity";
import { getGuestPersonId, getOpenShift, getRosterDayDetail, getShiftChecklist, getTodayShiftPeople } from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { getDueDoses, getVetAppointments } from "@/lib/care-data";
import { shelterToday, type Part } from "@/lib/shift";
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
    const [people, day, me, guestId] = await Promise.all([
      getTodayShiftPeople(date),
      getRosterDayDetail(date),
      getCurrentPerson(),
      getGuestPersonId(),
    ]);
    // Today's session times, the starting point for "Forgot to sign in?".
    const times = Object.fromEntries(day.map((s) => [s.part, { starts: s.starts, ends: s.ends }])) as Record<
      Part,
      { starts: string; ends: string }
    >;
    return (
      <PersonPicker people={people} today={date} times={times} isAdmin={me?.isAdmin ?? false} guestId={guestId} />
    );
  }

  // Only this shift's own tasks: the morning and afternoon lists are separate.
  const [checklist, doses, vet] = await Promise.all([
    getShiftChecklist(openShift.part),
    getDueDoses(openShift.date, openShift.part),
    getVetAppointments(openShift.date, openShift.date),
  ]);

  return (
    <ShiftChecklist
      byCategory={checklist.byCategory}
      carriedOver={checklist.carriedOver}
      extras={checklist.extras}
      doses={doses}
      vet={vet.filter((a) => a.part === openShift.part)}
    />
  );
}
