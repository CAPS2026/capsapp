"use client";

import { useRef, useState } from "react";
import { clock12, firstName, parseYmd, shelterToday, type ShiftTaskRow } from "@/lib/shift";
import {
  claimTask,
  markTaskNotRequired,
  reopenTask,
  signOffTask,
  unclaimTask,
  updateTaskNote,
} from "@/lib/actions/shift";

/** "Fri" for something carried over from this past week, "Fri 11 Sep"
 *  once it's old enough that the weekday alone would be ambiguous. */
function shortDate(s: string) {
  const d = parseYmd(s);
  const ageDays = Math.round((parseYmd(shelterToday()).getTime() - d.getTime()) / 86400000);
  return ageDays < 7
    ? d.toLocaleDateString("en-AU", { weekday: "short" })
    : d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function Checklist({
  tasks,
  busy,
  run,
}: {
  tasks: ShiftTaskRow[];
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  return (
    <div className="divide-y divide-line">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} busy={busy} run={run} />
      ))}
    </div>
  );
}

const TAG = "ml-1.5 inline-block rounded-[5px] px-[5px] py-px align-middle text-[9.5px] font-extrabold no-underline";

function TaskRow({
  task,
  busy,
  run,
}: {
  task: ShiftTaskRow;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  const done = task.status === "done";
  const notReq = task.status === "not_required";
  const open = !done && !notReq;

  const [note, setNote] = useState(task.note ?? "");
  const [hint, setHint] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  function saveNote() {
    const next = note.trim();
    if (next === (task.note ?? "")) return;
    updateTaskNote(task.id, next).then((r) => {
      if (r?.error) setHint(r.error);
    });
  }

  return (
    <div className={`flex items-start gap-2 px-3 py-[9px] ${task.carriedOver && open ? "bg-warm-tint" : ""}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(open ? () => signOffTask(task.id, note) : () => reopenTask(task.id))}
        aria-label={open ? "Mark done" : "Reopen"}
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 text-xs font-extrabold disabled:opacity-50 ${
          done
            ? "border-ok bg-ok text-white"
            : notReq
              ? "border-line bg-gray-tint text-ink-muted"
              : "border-line-cool bg-white"
        }`}
      >
        {done ? "✓" : notReq ? "–" : ""}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-[13.5px] font-semibold leading-[1.4] ${open ? "text-foreground" : "text-ink-muted line-through"}`}>
          {task.title}
          {task.isExtra && <span className={`${TAG} bg-brand-tint text-brand-ink`}>EXTRA</span>}
          {task.claimedByName && open && (
            <span className={`${TAG} bg-sun-tint text-[#8a6a12]`}>{firstName(task.claimedByName)}&rsquo;s</span>
          )}
          {task.carriedOver && open && (
            <span className={`${TAG} border border-[#F0D69A] bg-white text-warm-ink`}>from {shortDate(task.date)}</span>
          )}
        </div>

        {done && task.actionedByInitials && task.actionedAt && (
          <div className="mt-[3px] text-[10.5px] font-semibold text-ok">
            {task.actionedByInitials} &middot; {clock12(task.actionedAt)}
          </div>
        )}
        {notReq && (
          <div className="mt-[3px] text-[10.5px] font-semibold text-ink-muted">
            not needed{task.note ? `, ${task.note}` : ""}
          </div>
        )}
        {!notReq && task.note && !noteOpen && (
          <div className="mt-1 inline-block rounded-md bg-gray-tint px-[7px] py-[3px] text-[11px] leading-snug text-foreground">
            {task.note}
          </div>
        )}

        {open && noteOpen && (
          <input
            ref={noteRef}
            value={note}
            disabled={busy}
            autoFocus
            onChange={(e) => {
              setNote(e.target.value);
              setHint(null);
            }}
            onBlur={() => {
              saveNote();
              if (!note.trim()) setNoteOpen(false);
            }}
            placeholder="Note"
            className="mt-1.5 block h-8 w-full max-w-64 rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm"
          />
        )}

        {open && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {!task.claimedByName ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => claimTask(task.id))}
                className="rounded-md border border-dashed border-line-cool px-[7px] py-0.5 text-[10.5px] font-extrabold text-brand-ink disabled:opacity-50"
              >
                Nominate
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => unclaimTask(task.id))}
                className="rounded-md border border-dashed border-line-cool px-[7px] py-0.5 text-[10.5px] font-extrabold text-ink-muted disabled:opacity-50"
              >
                Withdraw
              </button>
            )}
            {!noteOpen && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setNoteOpen(true)}
                className="text-[10.5px] font-bold text-ink-muted disabled:opacity-50"
              >
                {task.note ? "Edit note" : "+ Note"}
              </button>
            )}
            {task.skippable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!note.trim()) {
                    setNoteOpen(true);
                    setHint("Add a reason in the note box first");
                    noteRef.current?.focus();
                    return;
                  }
                  run(() => markTaskNotRequired(task.id, note));
                }}
                className="text-[10.5px] font-bold text-warm-ink disabled:opacity-50"
              >
                Not needed
              </button>
            )}
            {hint && <span className="text-[10.5px] font-semibold text-warm-ink">{hint}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
