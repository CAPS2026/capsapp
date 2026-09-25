import Link from "next/link";
import { Fragment } from "react";
import { getMonthRoster, getRosterDayDetail, getRosterablePeople } from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { PART_LABEL, nameInitials, parseYmd, shelterToday, shiftDay, timeRange } from "@/lib/shift";
import { getCurrentPerson } from "@/lib/auth";
import { PersonAvatar } from "@/components/shift/person-avatar";
import { getAllLeaveRequests, getApprovedLeave, getMyLeaveRequests, resolveRequester } from "@/lib/leave-data";
import { LEAVE_SCOPE_LABEL, formatLeaveDates, leaveCoversDate, leaveCoversSession, scopeShort } from "@/lib/leave";
import { AskForLeave, CancelLeaveButton, DecisionButtons, StatusBadge } from "@/components/shift/leave-forms";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Monday-first week grid for `year`/`month` (1-12): each cell is a
 *  "YYYY-MM-DD" string, or null for the blanks before day 1 / after the
 *  last day. */
function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7; // 0=Mon .. 6=Sun

  const cells: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; d?: string }>;
}) {
  await checkAutoCloseAndSendEmails();

  const person = await getCurrentPerson();
  const sp = await searchParams;
  const today = shelterToday();
  const [todayYear, todayMonth] = today.split("-").map(Number);

  const year = Number(sp.y) || todayYear;
  const month = Number(sp.m) || todayMonth;
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : today;

  const monthFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthTo = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const [grid, dayDetail, leave, requester, people, allRequests] = await Promise.all([
    getMonthRoster(year, month),
    getRosterDayDetail(selected),
    getApprovedLeave(monthFrom, monthTo),
    resolveRequester(),
    getRosterablePeople(),
    person?.isAdmin ? getAllLeaveRequests() : Promise.resolve([]),
  ]);
  const mine = requester ? await getMyLeaveRequests(requester.id) : [];
  const leaveOn = (date: string) => leave.filter((l) => leaveCoversDate(l, date));
  const weeks = monthGrid(year, month);

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="flex max-w-5xl flex-col gap-3">
      {person?.isAdmin && (
        <div className="flex flex-wrap items-center gap-4">
          {/* Always in view at the top for admins (it used to sit on the day
              card, which could fall off the right edge of a narrower window). */}
          <Link
            href={`/shift/roster/edit?start=${monthFrom < today ? today : monthFrom}&days=31`}
            className="inline-flex h-11 items-center rounded-[var(--radius)] bg-brand px-5 text-sm font-bold text-white"
          >
            Edit roster
          </Link>
          <Link
            href="/shift/staff"
            className="inline-flex h-11 items-center rounded-[var(--radius)] border-[1.5px] border-brand px-5 text-sm font-bold text-brand-ink"
          >
            Staff: add, edit, remove
          </Link>
        </div>
      )}

      <div className="grid grid-cols-[1.6fr_1fr] items-start gap-5">
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <Link
              href={`/shift/roster?y=${prevMonth.y}&m=${prevMonth.m}`}
              aria-label="Previous month"
              className="px-2 py-0.5 text-[22px] font-extrabold text-brand-ink"
            >
              &larr;
            </Link>
            <span className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Link
              href={`/shift/roster?y=${nextMonth.y}&m=${nextMonth.m}`}
              aria-label="Next month"
              className="px-2 py-0.5 text-[22px] font-extrabold text-brand-ink"
            >
              &rarr;
            </Link>
          </div>

          <div className="mb-0.5 mt-1.5 grid grid-cols-7 gap-1.5">
            {DOW.map((d) => (
              <div key={d} className="pb-1 text-center text-[11.5px] font-extrabold uppercase text-ink-muted">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weeks.flat().map((date, i) => {
              if (!date) return <div key={i} />;
              const cell = grid[date];
              const isToday = date === today;
              const isSelected = date === selected;
              return (
                <Link
                  key={date}
                  href={`/shift/roster?y=${year}&m=${month}&d=${date}`}
                  aria-label={parseYmd(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
                  aria-current={isSelected ? "date" : undefined}
                  className={`flex min-h-[62px] flex-col gap-[3px] rounded-[9px] px-[5px] py-1.5 ${
                    isToday
                      ? "border-2 border-brand"
                      : isSelected
                        ? "border border-brand"
                        : "border border-line"
                  } ${isSelected ? "bg-brand-tint" : "bg-card"}`}
                >
                  <span className={`text-[13px] font-extrabold ${isToday ? "text-brand-ink" : "text-ink-muted"}`}>
                    {Number(date.slice(8))}
                  </span>
                  {cell?.am.length ? (
                    <span className="rounded-[5px] bg-brand-tint px-1 py-0.5 text-center text-[10.5px] font-extrabold leading-[1.4] text-brand-ink">
                      {cell.am.join(",")}
                    </span>
                  ) : null}
                  {cell?.pm.length ? (
                    <span className="rounded-[5px] bg-sun-tint px-1 py-0.5 text-center text-[10.5px] font-extrabold leading-[1.4] text-[#8a6a12]">
                      {cell.pm.join(",")}
                    </span>
                  ) : null}
                  {leaveOn(date).length > 0 && (
                    <span className="rounded-[5px] bg-[#FCEDE8] px-1 py-0.5 text-center text-[10.5px] font-extrabold leading-[1.4] text-[#9A3A26]">
                      Leave {leaveOn(date).map((l) => nameInitials(l.name)).join(",")}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-2 flex gap-3 text-[10.5px] font-semibold text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-[9px] w-[9px] rounded-[3px] bg-brand-tint" />
              Morning
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-[9px] w-[9px] rounded-[3px] bg-sun-tint" />
              Afternoon
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-[9px] w-[9px] rounded-[3px] bg-[#FCEDE8]" />
              On leave
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-card p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[15.5px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {parseYmd(selected).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              {person?.isAdmin && (
                <Link href={`/shift/roster/edit?start=${selected}&days=14`} className="text-[13px] font-bold text-brand-ink">
                  Edit &rarr;
                </Link>
              )}
            </div>

            {dayDetail.map((s) => (
              <Fragment key={s.part}>
              <div className="flex items-center justify-between border-t border-line py-2 first:border-0">
                <div>
                  <div className="text-[13px] font-extrabold text-foreground">{PART_LABEL[s.part]}</div>
                  <div className="text-[11.5px] font-semibold text-ink-muted">{timeRange(s.starts, s.ends)}</div>
                </div>
                <div className="flex" aria-label={s.people.length ? s.people.join(", ") : "Nobody rostered"}>
                  {s.attendees.length ? (
                    s.attendees.map((a, i) => (
                      <PersonAvatar
                        key={a.id}
                        name={a.full}
                        size={24}
                        className={`border-2 border-card ${i > 0 ? "-ml-2" : ""}`}
                      />
                    ))
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-ink-muted text-[10px] font-extrabold text-white"
                    >
                      ?
                    </span>
                  )}
                </div>
              </div>
              {s.attendees
                .filter((a) => leave.some((l) => l.personId === a.id && leaveCoversSession(l, selected, s.part)))
                .map((a) => (
                  <p key={a.id} className="m-0 -mt-1 pb-1 text-[11.5px] font-bold text-warm-ink">
                    {a.first} is on leave, needs cover
                  </p>
                ))}
              </Fragment>
            ))}

            {leaveOn(selected).length > 0 && (
              <div className="border-t border-line pt-2">
                <div className="text-[13px] font-extrabold text-[#9A3A26]">On leave</div>
                {leaveOn(selected).map((l) => (
                  <p key={l.id} className="m-0 text-[12.5px] font-semibold">
                    {l.name} ({scopeShort(l.scope)})
                  </p>
                ))}
              </div>
            )}

            {dayDetail.some((s) => s.attendees.length === 0) && (
              <p className="m-0 text-[11px] leading-normal text-ink-muted">
                {dayDetail
                  .filter((s) => s.attendees.length === 0)
                  .map((s) => PART_LABEL[s.part])
                  .join(" and ")}{" "}
                {dayDetail.filter((s) => s.attendees.length === 0).length > 1 ? "are" : "is"} unstaffed.
              </p>
            )}
          </div>

          <div className="flex justify-between text-xs">
            <Link href={`/shift/roster?d=${shiftDay(selected, -1)}&y=${year}&m=${month}`} className="font-semibold text-brand-ink">
              &larr; Previous day
            </Link>
            <Link href={`/shift/roster?d=${shiftDay(selected, 1)}&y=${year}&m=${month}`} className="font-semibold text-brand-ink">
              Next day &rarr;
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Leave this month
          </h2>
          <AskForLeave requester={requester} people={people} mine={mine} />
        </div>
        {leave.length === 0 ? (
          <p className="m-0 text-sm text-ink-muted">Nobody is on leave this month.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {leave.map((l) => (
              <li key={l.id} className="text-sm">
                <b>{l.name}</b> on leave, {formatLeaveDates(l.startDate, l.endDate)} ({scopeShort(l.scope)})
              </li>
            ))}
          </ul>
        )}
      </section>

      {person?.isAdmin && (
        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Leave requests (admins only)
          </h2>
          {allRequests.length === 0 && <p className="m-0 text-sm text-ink-muted">No leave requests yet.</p>}
          {allRequests.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="m-0 text-sm font-extrabold">{r.personName}</p>
                  <p className="m-0 text-sm">{formatLeaveDates(r.startDate, r.endDate)}</p>
                  <p className="m-0 text-xs text-ink-muted">{LEAVE_SCOPE_LABEL[r.scope]}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.note && <p className="m-0 text-xs">Reason: {r.note}</p>}
              {r.decisionNote && <p className="m-0 text-xs text-ink-muted">Message sent: {r.decisionNote}</p>}
              {r.status === "pending" && <DecisionButtons id={r.id} />}
              {r.status === "approved" && <CancelLeaveButton id={r.id} />}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
