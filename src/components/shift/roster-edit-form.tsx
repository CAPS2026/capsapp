"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRosterEntries } from "@/lib/actions/shift";
import { parseYmd } from "@/lib/shift";
import type { RosterEditRow } from "@/lib/shift-data";

const selectClass = "h-10 w-full rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm";

export function RosterEditForm({
  start,
  days,
  people,
  initialRows,
}: {
  start: string;
  days: number;
  people: { id: string; name: string }[];
  initialRows: RosterEditRow[];
}) {
  const router = useRouter();
  const [rangeStart, setRangeStart] = useState(start);
  const [rangeDays, setRangeDays] = useState(days);
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function setPerson(date: string, part: "morningPersonId" | "afternoonPersonId", value: string) {
    setRows((rs) => rs.map((r) => (r.date === date ? { ...r, [part]: value || null } : r)));
    setStatus(null);
  }

  function loadRange() {
    router.push(`/shift/roster/edit?start=${rangeStart}&days=${rangeDays}`);
  }

  function save() {
    setStatus(null);
    startTransition(async () => {
      const r = await saveRosterEntries(rows);
      setStatus(r.error ?? "Saved.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2 rounded-[var(--radius)] border border-line bg-card p-3">
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
          Start date
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="h-10 rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm"
          />
        </label>
        <label className="flex w-20 flex-col gap-1 text-xs font-semibold">
          Days
          <input
            type="number"
            min={1}
            max={31}
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value) || 1)}
            className="h-10 rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={loadRange}
          className="h-10 rounded-[var(--radius)] border border-line-cool px-3 text-sm font-bold text-brand-ink"
        >
          Load
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.date} className="rounded-[var(--radius)] border border-line bg-card p-3">
            <p className="mb-2 text-sm font-bold">
              {parseYmd(row.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
                Morning
                <select
                  className={selectClass}
                  value={row.morningPersonId ?? ""}
                  onChange={(e) => setPerson(row.date, "morningPersonId", e.target.value)}
                >
                  <option value="">Nobody rostered</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
                Afternoon
                <select
                  className={selectClass}
                  value={row.afternoonPersonId ?? ""}
                  onChange={(e) => setPerson(row.date, "afternoonPersonId", e.target.value)}
                >
                  <option value="">Nobody rostered</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-paper py-3">
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="h-11 flex-1 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {status && (
          <span className={`text-sm font-semibold ${status === "Saved." ? "text-ok" : "text-danger"}`}>{status}</span>
        )}
      </div>
    </div>
  );
}
