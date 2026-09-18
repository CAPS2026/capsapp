import Link from "next/link";
import { getMonthRoster, getRosterDayDetail } from "@/lib/shift-data";
import { checkAutoCloseAndSendEmails } from "@/lib/shift-email";
import { PART_LABEL, parseYmd, shelterToday, shiftDay } from "@/lib/shift";
import { getCurrentPerson } from "@/lib/auth";

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
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 p-4 pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/shift" className="text-sm font-semibold text-brand-ink">
            ← Today
          </Link>
          <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Roster
          </h1>
        </div>
        <Link href="/shift/handover" className="text-sm font-semibold text-ink-muted">
          Handover log
        </Link>
      </header>

      <p className="text-xs leading-relaxed text-ink-muted">
        Read-only for everyone except admins, who can use Edit roster below to assign people to sessions.
      </p>

      {person?.isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/people/new"
            className="rounded-[var(--radius)] bg-brand px-3 py-2 text-sm font-bold text-white"
          >
            + Add staff member
          </Link>
          <Link
            href="/shift/roster/edit"
            className="rounded-[var(--radius)] border border-line-cool px-3 py-2 text-sm font-bold text-brand-ink"
          >
            Edit roster
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={`/shift/roster?y=${prevMonth.y}&m=${prevMonth.m}`} className="px-2 text-xl font-extrabold text-brand-ink">
          ←
        </Link>
        <span className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <Link href={`/shift/roster?y=${nextMonth.y}&m=${nextMonth.m}`} className="px-2 text-xl font-extrabold text-brand-ink">
          →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DOW.map((d) => (
          <div key={d} className="pb-1.5 text-center text-[11.5px] font-extrabold uppercase text-ink-muted">
            {d}
          </div>
        ))}
        {weeks.flat().map((date, i) => {
          if (!date) return <div key={i} />;
          const cell = grid[date];
          const isToday = date === today;
          const isSelected = date === selected;
          return (
            <Link
              key={date}
              href={`/shift/roster?y=${year}&m=${month}&d=${date}`}
              className={`flex min-h-[58px] flex-col items-center gap-1 rounded-lg border p-1.5 text-center ${
                isSelected ? "border-brand bg-brand-tint" : isToday ? "border-brand" : "border-line bg-card"
              }`}
            >
              <span className="text-[13px] font-bold text-ink-muted">{Number(date.slice(8))}</span>
              {cell?.am.length ? (
                <span className="rounded bg-brand-tint px-1.5 py-0.5 text-[10.5px] font-extrabold text-brand-ink">
                  {cell.am.join(",")}
                </span>
              ) : null}
              {cell?.pm.length ? (
                <span className="rounded bg-sun-tint px-1.5 py-0.5 text-[10.5px] font-extrabold text-warm-ink">
                  {cell.pm.join(",")}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-3 text-xs font-semibold text-ink-muted">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand-tint align-middle" /> Morning
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sun-tint align-middle" /> Afternoon
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-card p-3.5">
        <p className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {parseYmd(selected).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {dayDetail.map((s) => (
          <div key={s.part} className="flex items-center justify-between border-t border-line py-2 first:border-0 first:pt-0">
            <div>
              <p className="text-sm font-bold">{PART_LABEL[s.part]}</p>
              <p className="text-xs text-ink-muted">
                {s.starts}–{s.ends}
              </p>
            </div>
            <p className="max-w-[55%] text-right text-sm text-ink-muted">
              {s.people.length ? s.people.join(", ") : "Nobody rostered"}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs">
        <Link href={`/shift/roster?d=${shiftDay(selected, -1)}&y=${year}&m=${month}`} className="font-semibold text-brand-ink">
          ← Previous day
        </Link>
        <Link href={`/shift/roster?d=${shiftDay(selected, 1)}&y=${year}&m=${month}`} className="font-semibold text-brand-ink">
          Next day →
        </Link>
      </div>
    </div>
  );
}
