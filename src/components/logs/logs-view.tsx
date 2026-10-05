"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ACTIVITY_TABS,
  ACTIVITY_TYPES,
  LOG_TABS,
  REGISTER_TABS,
  rowsToCsv,
  type LogTab,
  type LogTable,
} from "@/lib/logs";

const controlClass = "h-10 px-2 rounded-[var(--radius)] border border-line-cool bg-white text-sm";

type Option = { id: string; name: string };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Type-to-search picker: start typing a name, pick it from the list. Much
 *  quicker than scrolling a 40-name dropdown to find one person. */
function SearchPick({
  label,
  options,
  valueId,
  onPick,
}: {
  label: string;
  options: Option[];
  valueId: string;
  onPick: (id: string) => void;
}) {
  const current = options.find((o) => o.id === valueId)?.name ?? "";
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);
  const listId = `pick-${label}`;

  function resolve(t: string) {
    const exact = options.find((o) => o.name.toLowerCase() === t.trim().toLowerCase());
    if (exact) onPick(exact.id);
    else if (t.trim() === "") onPick("");
  }

  return (
    <label className="flex flex-col gap-0.5 text-xs text-ink">
      {label}
      <input
        list={listId}
        value={text}
        placeholder="All"
        onChange={(e) => {
          setText(e.target.value);
          resolve(e.target.value);
        }}
        onBlur={() => setText(current)}
        className={`${controlClass} w-44`}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.id} value={o.name} />
        ))}
      </datalist>
    </label>
  );
}

export function LogsView({
  tab,
  data,
  options,
}: {
  tab: LogTab;
  data: LogTable;
  options: { dogs: Option[]; people: Option[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const dogId = params.get("dog") ?? "";
  const personId = params.get("person") ?? "";
  const status = params.get("status") ?? "";
  const flag = params.get("flag") ?? "";
  const q = params.get("q") ?? "";
  const types = (params.get("types") ?? "").split(",").filter(Boolean);
  const [qText, setQText] = useState(q);
  useEffect(() => setQText(q), [q]);

  function setParams(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next.toString()}`);
  }
  const setParam = (key: string, value: string) => setParams({ [key]: value });

  function goTab(t: LogTab) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", t);
    // Filters that don't apply to the new tab are dropped: person doesn't
    // apply to Medical, dog doesn't apply to Visitors, registers take
    // neither, and the activity-only ones (type, status, flags, notes) only
    // apply to the activity tabs.
    if (t === "medical" || REGISTER_TABS.includes(t)) next.delete("person");
    if (t === "site" || REGISTER_TABS.includes(t)) next.delete("dog");
    if (!ACTIVITY_TABS.includes(t)) for (const k of ["status", "flag", "q"]) next.delete(k);
    if (t !== "activity") next.delete("types");
    router.replace(`${pathname}?${next.toString()}`);
  }

  function preset(kind: "today" | "7" | "28" | "month") {
    const now = new Date();
    const start = new Date(now);
    if (kind === "7") start.setDate(now.getDate() - 6);
    if (kind === "28") start.setDate(now.getDate() - 27);
    if (kind === "month") start.setDate(1);
    setParams({ from: ymd(start), to: ymd(now) });
  }

  function toggleType(key: string) {
    const next = types.includes(key) ? types.filter((t) => t !== key) : [...types, key];
    setParam("types", next.join(","));
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
  const isActivity = ACTIVITY_TABS.includes(tab);
  const showDog = !isRegister && tab !== "site";
  const showPerson = !isRegister && tab !== "medical";
  const anyFilter = from || to || dogId || personId || status || flag || q || types.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {LOG_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => goTab(t.key)}
            className={`shrink-0 px-3 h-8 rounded-full text-sm font-semibold border ${
              tab === t.key ? "bg-brand text-white border-brand" : "border-line-cool text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "activity" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink mr-1">Show:</span>
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => toggleType(t.key)}
              className={`px-3 h-8 rounded-full text-sm font-semibold border ${
                types.includes(t.key) ? "bg-brand text-white border-brand" : "border-line-cool text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="text-xs text-ink">{types.length === 0 ? "(all types)" : ""}</span>
        </div>
      )}

      {true ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink mr-1">Quick dates:</span>
          {(
            [
              ["today", "Today"],
              ["7", "Last 7 days"],
              ["28", "Last 28 days"],
              ["month", "This month"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => preset(k)}
              className="px-3 h-8 rounded-full text-sm font-semibold border border-line-cool text-ink"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5 text-xs text-ink">
          From
          <input type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className={controlClass} />
        </label>
        <label className="flex flex-col gap-0.5 text-xs text-ink">
          To
          <input type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className={controlClass} />
        </label>
        {showDog && <SearchPick label="Dog" options={options.dogs} valueId={dogId} onPick={(id) => setParam("dog", id)} />}
        {showPerson && (
          <SearchPick label="Person" options={options.people} valueId={personId} onPick={(id) => setParam("person", id)} />
        )}
        {isActivity && (
          <>
            <label className="flex flex-col gap-0.5 text-xs text-ink">
              Status
              <select value={status} onChange={(e) => setParam("status", e.target.value)} className={controlClass}>
                <option value="">Any</option>
                <option value="open">Still out</option>
                <option value="closed">Returned</option>
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-xs text-ink">
              Flags
              <select value={flag} onChange={(e) => setParam("flag", e.target.value)} className={controlClass}>
                <option value="">Any</option>
                <option value="late">Logged after the fact</option>
                <option value="edited">Edited</option>
              </select>
            </label>
            <form
              className="flex flex-col gap-0.5 text-xs text-ink"
              onSubmit={(e) => {
                e.preventDefault();
                setParam("q", qText.trim());
              }}
            >
              <label htmlFor="log-notes">Search notes</label>
              <input
                id="log-notes"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                onBlur={() => qText.trim() !== q && setParam("q", qText.trim())}
                placeholder="e.g. heart worm"
                className={`${controlClass} w-40`}
              />
            </form>
          </>
        )}
        {anyFilter && (
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

      <p className="text-xs text-ink">
        {data.summary ?? `${data.rows.length} row${data.rows.length === 1 ? "" : "s"}`}
        {data.capped ? ` (showing the most recent ${data.rows.length} — narrow the dates for more)` : ""}
      </p>

      <div className="overflow-x-auto border border-line rounded-[var(--radius)]">
        <table className="min-w-full text-sm border-collapse">
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
                <td colSpan={data.columns.length} className="px-3 py-6 text-center text-ink">
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
