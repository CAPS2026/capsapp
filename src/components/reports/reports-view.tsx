"use client";

import { rowsToCsv } from "@/lib/logs";
import type { ReportTable } from "@/lib/reports-data";

export function ReportsView({ reports }: { reports: ReportTable[] }) {
  return (
    <div className="flex flex-col gap-6">
      {reports.map((r) => (
        <section key={r.key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">
              {r.title}{" "}
              <span className="text-sm font-normal text-ink-muted">({r.rows.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => downloadCsv(r)}
              disabled={r.rows.length === 0}
              className="h-8 px-3 rounded-[var(--radius)] border border-line-cool text-xs font-bold disabled:opacity-50"
            >
              CSV
            </button>
          </div>
          {r.note && <p className="text-xs text-ink-muted">{r.note}</p>}
          <div className="overflow-x-auto border border-line rounded-[var(--radius)]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-tint text-left">
                  {r.columns.map((c) => (
                    <th key={c} className="px-3 py-2 font-bold whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.rows.length === 0 && (
                  <tr>
                    <td colSpan={r.columns.length} className="px-3 py-5 text-center text-ink-muted">
                      Nothing right now.
                    </td>
                  </tr>
                )}
                {r.rows.map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    {r.columns.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap">
                        {row[c] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function downloadCsv(r: ReportTable) {
  const blob = new Blob([rowsToCsv(r.columns, r.rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caps-report-${r.key}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
