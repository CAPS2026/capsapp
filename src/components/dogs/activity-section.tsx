"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityEntry } from "@/lib/dog-detail";
import { EditActivityDialog } from "@/components/dogs/edit-activity-dialog";
import {
  formatActivityRecordLine,
  formatDate,
  formatDuration,
  formatFullDateTime,
} from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  walk: "Walk",
  yard: "Yard",
  bed_rest: "Bed rest",
  jail_break: "Jail break",
  foster: "Foster",
};

// docs/ui-flows.md §3 + Paul 2026-09-08: condensed one-line records, a
// scrollable "recent" list that shows ~4 at a time, and any line pops out
// to its full record (with Edit times) in a modal.
export function ActivitySection({
  dogId,
  latest,
  recent,
  canKiosk,
  currentPersonId,
}: {
  dogId: string;
  latest: { type: string; entry: ActivityEntry | null }[];
  recent: ActivityEntry[];
  canKiosk: boolean;
  currentPersonId: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"record" | "edit" | null>(null);
  const recordRef = useRef<HTMLDialogElement>(null);

  const byId = useMemo(() => {
    const m = new Map<string, ActivityEntry>();
    for (const e of recent) m.set(e.id, e);
    for (const { entry } of latest) if (entry) m.set(entry.id, entry);
    return m;
  }, [recent, latest]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const canEdit = selected ? canKiosk || selected.personId === currentPersonId : false;

  useEffect(() => {
    if (mode === "record") recordRef.current?.showModal();
    else recordRef.current?.close();
  }, [mode]);

  function openRecord(id: string) {
    setSelectedId(id);
    setMode("record");
  }

  return (
    <>
      <div className={`flex flex-col gap-1 ${canKiosk ? "pb-2 border-b border-line" : ""}`}>
        {latest.map(({ type, entry }) => (
          <div key={type} className="text-sm">
            <span className="font-semibold">{TYPE_LABEL[type] ?? type}: </span>
            {entry ? (
              <button
                type="button"
                onClick={() => openRecord(entry.id)}
                className="text-left underline-offset-2 hover:underline"
              >
                {formatActivityRecordLine(entry)}
              </button>
            ) : (
              <span className="text-ink-muted">None yet</span>
            )}
          </div>
        ))}
      </div>

      {/* Full who-did-what history is for staff + Volunteer Plus — plain
          volunteers get the latest-of-each-type summary above and nothing
          more. The hard boundary (other people's names) is already
          enforced by RLS on the person embed; this just keeps the plain
          volunteer view lean. */}
      {canKiosk && (
        <div className="pt-1 flex flex-col gap-1">
          <h3 className="text-sm font-bold text-ink-muted">Recent activity</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-muted">No activity yet.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto border border-line rounded-[var(--radius)] divide-y divide-line">
              {recent.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openRecord(a.id)}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-gray-tint flex items-baseline gap-2"
                >
                  <span className="font-semibold shrink-0">{TYPE_LABEL[a.type] ?? a.type}</span>
                  <span className="flex-1 min-w-0">{formatActivityRecordLine(a)}</span>
                  {(a.enteredLate || a.editedAt) && (
                    <span className="text-xs text-warm-ink font-semibold shrink-0">
                      {a.enteredLate ? "late" : "edited"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <dialog
        ref={recordRef}
        onClose={() => setMode((m) => (m === "record" ? null : m))}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && recordRef.current?.close()}
      >
        {selected && (
          <div className="flex flex-col gap-3 p-5">
            <h2 className="font-bold text-lg">{TYPE_LABEL[selected.type] ?? selected.type}</h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row label="Who" value={selected.personName ?? "—"} />
              <Row label="Check Out" value={formatFullDateTime(selected.startedAt)} />
              <Row
                label="Check In"
                value={selected.endedAt ? formatFullDateTime(selected.endedAt) : "Still out"}
              />
              <Row
                label={selected.endedAt ? "Total time" : "Out for"}
                value={
                  selected.endedAt
                    ? formatDuration(selected.startedAt, selected.endedAt)
                    : `${formatDuration(selected.startedAt, new Date().toISOString())} so far`
                }
              />
              {selected.dueBack && <Row label="Due back" value={formatFullDateTime(selected.dueBack)} />}
              {selected.reason && <Row label="Reason" value={selected.reason} />}
              {selected.enteredLate && <Row label="Flag" value="Logged after the fact" />}
              {selected.editedAt && <Row label="Edited" value={formatDate(selected.editedAt)} />}
            </dl>
            <div className="flex gap-2 justify-end pt-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    recordRef.current?.close();
                    setMode("edit");
                  }}
                  className="h-10 px-4 rounded-[var(--radius)] font-semibold text-brand-ink"
                >
                  Edit times
                </button>
              )}
              <button
                type="button"
                onClick={() => recordRef.current?.close()}
                className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>

      {selected && (
        <EditActivityDialog
          dogId={dogId}
          activityId={selected.id}
          startedAt={selected.startedAt}
          endedAt={selected.endedAt}
          isOpen={mode === "edit"}
          onClose={() => {
            setMode(null);
            setSelectedId(null);
          }}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
