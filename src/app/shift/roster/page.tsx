import Link from "next/link";
import { getMonthRoster, getRosterDayDetail } from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { PART_LABEL, parseYmd, shelterToday, shiftDay, timeRange } from "@/lib/shift";
import { getCurrentPerson } from "@/lib/auth";
import { PersonAvatar } from "@/components/shift/person-avatar";

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

  const [grid, dayDetail] = await Promise.all([getMonthRoster(year, month), getRosterDayDetail(selected)]);
  const weeks = monthGrid(year, month);

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="flex max-w-5xl flex-col gap-3">
      {person?.isAdmin && (
        <div>
          <Link href="/people/new" className="text-[13px] font-bold text-brand-ink">
            + Add staff member
          </Link>
        </div>
      )}

      <div className="grid grid-cols-[1.6fr_1fr] items-start gap-5">
        <div>
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
          </div>
        </div>

        <div className="flex flex-col gap-3">
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
              <div key={s.part} className="flex items-center justify-between border-t border-line py-2 first:border-0">
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
            ))}

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
    </div>
  );
}
