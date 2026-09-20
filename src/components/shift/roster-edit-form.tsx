"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRosterEntries } from "@/lib/actions/shift";
import { parseYmd } from "@/lib/shift";
import { leaveCoversSession, type RosterLeave } from "@/lib/leave";
import type { RosterEditRow } from "@/lib/shift-data";

const selectClass = "h-10 w-full rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm";

/** UI-only shape: each part always shows 1 or 2 dropdown slots. A slot
 *  can be "" (nothing picked yet), filtered out before saving. Separate
 *  from RosterEditRow so an empty second slot never gets sent to the
 *  server as if it meant something. */
type EditRow = { date: string; morning: string[]; afternoon: string[] };

function toEditRow(r: RosterEditRow): EditRow {
  return {
    date: r.date,
    morning: r.morningPersonIds.length ? r.morningPersonIds : [""],
    afternoon: r.afternoonPersonIds.length ? r.afternoonPersonIds : [""],
  };
}

export function RosterEditForm({
  start,
  days,
  people,
  initialRows,
  leave,
}: {
  start: string;
  days: number;
  people: { id: string; name: string }[];
  initialRows: RosterEditRow[];
  /** Approved leave in this range, so people away are labelled in the dropdown. */
  leave: RosterLeave[];
}) {
  const router = useRouter();
  const [rangeStart, setRangeStart] = useState(start);
  const [rangeDays, setRangeDays] = useState(days);
  const [rows, setRows] = useState<EditRow[]>(initialRows.map(toEditRow));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function setSlot(date: string, key: "morning" | "afternoon", index: number, value: string) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.date !== date) return r;
        const next = [...r[key]];
        next[index] = value;
        return { ...r, [key]: next };
      }),
    );
    setStatus(null);
  }

  function addSecond(date: string, key: "morning" | "afternoon") {
    setRows((rs) => rs.map((r) => (r.date === date ? { ...r, [key]: [...r[key], ""] } : r)));
  }

  function removeSecond(date: string, key: "morning" | "afternoon") {
    setRows((rs) => rs.map((r) => (r.date === date ? { ...r, [key]: [r[key][0]] } : r)));
    setStatus(null);
  }

  function loadRange() {
    router.push(`/shift/roster/edit?start=${rangeStart}&days=${rangeDays}`);
  }

  function save() {
    setStatus(null);
    startTransition(async () => {
      const entries = rows.map((r) => ({
        date: r.date,
        morningPersonIds: r.morning.filter(Boolean),
        afternoonPersonIds: r.afternoon.filter(Boolean),
      }));
      const r = await saveRosterEntries(entries);
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
              {(["morning", "afternoon"] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-ink-muted">
                    {key === "morning" ? "Morning" : "Afternoon"}
                  </span>
                  {row[key].map((personId, i) => (
                    <select
                      key={i}
                      className={selectClass}
                      value={personId}
                      onChange={(e) => setSlot(row.date, key, i, e.target.value)}
                    >
                      <option value="">{i === 0 ? "Nobody rostered" : "Second person"}</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {`${p.name}${leave.some((l) => l.personId === p.id && leaveCoversSession(l, row.date, key)) ? " (on leave)" : ""}`}
                        </option>
                      ))}
                    </select>
                  ))}
                  {row[key].length < 2 ? (
                    <button
                      type="button"
                      onClick={() => addSecond(row.date, key)}
                      className="self-start text-xs font-semibold text-brand-ink"
                    >
                      + Add second person
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeSecond(row.date, key)}
                      className="self-start text-xs font-semibold text-ink-muted"
                    >
                      Remove second person
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-background py-3">
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
