"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LOG_TABS, REGISTER_TABS, rowsToCsv, type LogTab, type LogTable } from "@/lib/logs";

const controlClass =
  "h-10 px-2 rounded-[var(--radius)] border border-line-cool bg-white text-sm";

export function LogsView({
  tab,
  data,
  options,
}: {
  tab: LogTab;
  data: LogTable;
  options: { dogs: { id: string; name: string }[]; people: { id: string; name: string }[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const dogId = params.get("dog") ?? "";
  const personId = params.get("person") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function goTab(t: LogTab) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", t);
    // person filter doesn't apply to Medical; dog doesn't apply to Visitors;
    // the registers (Dogs / People) take neither.
    if (t === "medical" || REGISTER_TABS.includes(t)) next.delete("person");
    if (t === "site" || REGISTER_TABS.includes(t)) next.delete("dog");
    router.replace(`${pathname}?${next.toString()}`);
  }

  function downloadCsv() {
    const csv = rowsToCsv(data.columns, data.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caps-${tab}-log.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const isRegister = REGISTER_TABS.includes(tab);
  const showDog = !isRegister && tab !== "site";
  const showPerson = !isRegister && tab !== "medical";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {LOG_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => goTab(t.key)}
            className={`shrink-0 px-3 h-8 rounded-full text-sm font-semibold border ${
              tab === t.key ? "bg-brand text-white border-brand" : "border-line-cool text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5 text-xs text-ink-muted">
          From
          <input type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className={controlClass} />
        </label>
        <label className="flex flex-col gap-0.5 text-xs text-ink-muted">
          To
          <input type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className={controlClass} />
        </label>
        {showDog && (
          <label className="flex flex-col gap-0.5 text-xs text-ink-muted">
            Dog
            <select value={dogId} onChange={(e) => setParam("dog", e.target.value)} className={controlClass}>
              <option value="">All</option>
              {options.dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {showPerson && (
          <label className="flex flex-col gap-0.5 text-xs text-ink-muted">
            Person
            <select value={personId} onChange={(e) => setParam("person", e.target.value)} className={controlClass}>
              <option value="">All</option>
              {options.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {(from || to || dogId || personId) && (
          <button
            type="button"
            onClick={() => router.replace(`${pathname}?tab=${tab}`)}
            className="h-10 px-3 text-sm font-semibold text-brand-ink"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={downloadCsv}
          disabled={data.rows.length === 0}
          className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white text-sm font-bold disabled:opacity-50 ml-auto"
        >
          Download CSV
        </button>
      </div>

      <p className="text-xs text-ink-muted">
        {data.rows.length} row{data.rows.length === 1 ? "" : "s"}
        {data.capped ? ` (showing the most recent ${data.rows.length} — narrow the dates for more)` : ""}
      </p>

      <div className="overflow-x-auto border border-line rounded-[var(--radius)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-tint text-left">
              {data.columns.map((c) => (
                <th key={c} className="px-3 py-2 font-bold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={data.columns.length} className="px-3 py-6 text-center text-ink-muted">
                  Nothing for this filter.
                </td>
              </tr>
            )}
            {data.rows.map((row, i) => (
              <tr key={i} className="border-t border-line align-top">
                {data.columns.map((c) => (
                  <td
                    key={c}
                    className={`px-3 py-2 whitespace-nowrap ${
                      c === "Flags" && row[c] ? "text-warm-ink font-semibold" : ""
                    }`}
                  >
                    {row[c] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
