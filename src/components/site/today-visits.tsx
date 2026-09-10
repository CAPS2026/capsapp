import Link from "next/link";
import type { DayVisit } from "@/lib/site-visits-data";
import { formatTime24 } from "@/lib/format";

// The "log for the day" under the who's-here board (Paul, 2026-09-10):
// everyone who signed in today, with in / out / reason. Anything older
// lives in Logs.
export function TodayVisits({ visits, isStaff }: { visits: DayVisit[]; isStaff: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Today</h2>

      {visits.length === 0 ? (
        <p className="text-sm text-ink-muted">No visits yet today.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border border-line rounded-[var(--radius)]">
          {visits.map((v) => (
            <li key={v.id} className="px-3 py-2 text-sm">
              <p className="font-semibold">{v.displayName}</p>
              <p className="text-ink-muted">
                {v.reasonLabel} · in {formatTime24(v.checkedIn)} ·{" "}
                {v.checkedOut ? `out ${formatTime24(v.checkedOut)}` : "still here"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {isStaff && (
        <Link
          href="/logs?tab=site"
          className="text-sm font-semibold text-brand-ink self-start"
        >
          Earlier visits in Logs →
        </Link>
      )}
    </section>
  );
}
