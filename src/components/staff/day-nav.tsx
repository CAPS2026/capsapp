"use client";

import { useRouter } from "next/navigation";
import { shiftDay, parseYmd } from "@/lib/staff";

export function DayNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`/staff?date=${d}`);

  const d = parseYmd(date);
  const label = d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
  const rel =
    date === today
      ? "Today"
      : date === shiftDay(today, 1)
        ? "Tomorrow"
        : date === shiftDay(today, -1)
          ? "Yesterday"
          : null;

  return (
    <div className="flex items-center justify-between gap-2 bg-card border border-line rounded-[var(--radius)] p-2">
      <button
        type="button"
        onClick={() => go(shiftDay(date, -1))}
        aria-label="Previous day"
        className="w-10 h-10 rounded-[var(--radius)] text-lg font-bold text-ink-muted hover:bg-gray-tint"
      >
        ‹
      </button>
      <div className="text-center leading-tight">
        <div className="font-bold text-sm">{label}</div>
        {rel && <div className="text-xs text-ink-muted">{rel}</div>}
        {!rel && (
          <button type="button" onClick={() => go(today)} className="text-xs text-brand-ink font-semibold">
            Jump to today
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => go(shiftDay(date, 1))}
        aria-label="Next day"
        className="w-10 h-10 rounded-[var(--radius)] text-lg font-bold text-ink-muted hover:bg-gray-tint"
      >
        ›
      </button>
    </div>
  );
}
