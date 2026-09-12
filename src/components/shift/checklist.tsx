"use client";

import { useRef, useState } from "react";
import { parseYmd, type ShiftTaskRow } from "@/lib/shift";
import {
  claimTask,
  markTaskNotRequired,
  reopenTask,
  signOffTask,
  unclaimTask,
  updateTaskNote,
} from "@/lib/actions/shift";

function shortDate(s: string) {
  return parseYmd(s).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}
function timeOf(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function Checklist({
  tasks,
  busy,
  run,
  showFrom,
}: {
  tasks: ShiftTaskRow[];
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
  showFrom?: boolean;
}) {
  return (
    <div className="divide-y divide-line">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} busy={busy} run={run} showFrom={showFrom} />
      ))}
    </div>
  );
}

function TaskRow({
  task,
  busy,
  run,
  showFrom,
}: {
  task: ShiftTaskRow;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
  showFrom?: boolean;
}) {
  const done = task.status === "done";
  const notReq = task.status === "not_required";

  const [note, setNote] = useState(task.note ?? "");
  const [hint, setHint] = useState<string | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  function saveNote() {
    const next = note.trim();
    if (next === (task.note ?? "")) return;
    updateTaskNote(task.id, next).then((r) => {
      if (r?.error) setHint(r.error);
    });
  }

  return (
    <div className={`flex flex-col gap-1.5 p-3 text-sm ${task.carriedOver ? "bg-warm-tint" : ""}`}>
      <div className="flex flex-wrap items-start gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(done || notReq ? () => reopenTask(task.id) : () => signOffTask(task.id, note))}
          aria-label={done || notReq ? "Reopen" : "Mark done"}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 font-bold disabled:opacity-50 ${
            done ? "border-ok bg-ok text-white" : notReq ? "border-line bg-gray-tint text-ink-muted" : "border-line-cool"
          }`}
        >
          {done ? "✓" : notReq ? "–" : ""}
        </button>

        <span className={`min-w-[8rem] flex-1 ${done || notReq ? "text-ink-muted line-through" : "font-medium"}`}>
          {task.title}
          {task.isExtra && <span className="ml-1.5 rounded bg-brand-tint px-1.5 py-0.5 text-[10px] font-extrabold text-brand-ink no-underline">EXTRA</span>}
          {task.claimedByName && !done && !notReq && (
            <span className="ml-1.5 rounded bg-sun-tint px-1.5 py-0.5 text-[10px] font-extrabold text-warm-ink no-underline">
              {task.claimedByName.split(" ")[0]}&rsquo;s
            </span>
          )}
          {showFrom && (
            <span className="ml-1.5 text-xs font-semibold text-warm-ink no-underline">from {shortDate(task.date)}</span>
          )}
          {done && task.actionedByInitials && (
            <span className="ml-1.5 text-xs font-semibold text-ok no-underline">
              {task.actionedByInitials} {timeOf(task.actionedAt)}
            </span>
          )}
          {notReq && (
            <span className="ml-1.5 text-xs text-ink-muted no-underline">not needed{task.note ? `: ${task.note}` : ""}</span>
          )}
        </span>

        {!done && !notReq && (
          <input
            ref={noteRef}
            value={note}
            disabled={busy}
            onChange={(e) => {
              setNote(e.target.value);
              setHint(null);
            }}
            onBlur={saveNote}
            placeholder="Note"
            className="h-8 min-w-0 flex-1 basis-40 rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-3 pl-8 text-xs font-semibold">
        {!done && !notReq && !task.claimedByName && (
          <button type="button" disabled={busy} onClick={() => run(() => claimTask(task.id))} className="text-brand-ink disabled:opacity-50">
            Claim
          </button>
        )}
        {!done && !notReq && task.claimedByName && (
          <button type="button" disabled={busy} onClick={() => run(() => unclaimTask(task.id))} className="text-ink-muted disabled:opacity-50">
            Unclaim
          </button>
        )}
        {!done && !notReq && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!note.trim()) {
                setHint("Add a reason in the note box first");
                noteRef.current?.focus();
                return;
              }
              run(() => markTaskNotRequired(task.id, note));
            }}
            className="text-warm-ink disabled:opacity-50"
          >
            Not needed
          </button>
        )}
        {(done || notReq) && (
          <button type="button" disabled={busy} onClick={() => run(() => reopenTask(task.id))} className="text-ink-muted disabled:opacity-50">
            Reopen
          </button>
        )}
        {hint && <span className="font-normal text-warm-ink">{hint}</span>}
      </div>
    </div>
  );
}
