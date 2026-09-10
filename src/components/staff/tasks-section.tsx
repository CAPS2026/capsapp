"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PART_LABEL, parseYmd, type Part, type TaskRow } from "@/lib/staff";
import {
  signOffTask,
  markTaskNotRequired,
  reopenTask,
  updateTaskNote,
  addAdhocTask,
  deleteAdhocTask,
} from "@/lib/actions/staff";

function shortDate(s: string) {
  return parseYmd(s).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}
function timeOf(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TasksSection({
  date,
  today,
  tasks,
  isAdmin,
}: {
  date: string;
  today: string;
  tasks: { today: TaskRow[]; carriedOver: TaskRow[] };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });
  };

  const byPart = (part: Part) => tasks.today.filter((t) => t.part === part);
  const isFuture = date > today;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Tasks</h2>
      {error && <p className="text-sm text-danger">{error}</p>}

      {tasks.carriedOver.length > 0 && (
        <div className="bg-warm-tint border border-warm/40 rounded-[var(--radius)] p-2 flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wide text-warm-ink px-1">
            Carried over — still open from earlier
          </p>
          {tasks.carriedOver.map((t) => (
            <TaskItem key={t.id} task={t} isAdmin={isAdmin} busy={isPending} run={run} showFrom />
          ))}
        </div>
      )}

      {(["morning", "afternoon"] as Part[]).map((part) => (
        <div key={part} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{PART_LABEL[part]}</h3>
            {isAdmin && (
              <AddTask
                busy={isPending}
                onAdd={(title, done) => run(() => addAdhocTask(date, part, title), done)}
              />
            )}
          </div>
          <div className="bg-card border border-line rounded-[var(--radius)] divide-y divide-line">
            {byPart(part).length === 0 ? (
              <p className="text-sm text-ink-muted p-3">No {PART_LABEL[part].toLowerCase()} tasks.</p>
            ) : (
              byPart(part).map((t) => (
                <TaskItem key={t.id} task={t} isAdmin={isAdmin} busy={isPending} run={run} />
              ))
            )}
          </div>
        </div>
      ))}

      {isFuture && (
        <p className="text-xs text-ink-muted">
          <span className="font-bold text-brand-ink">R</span> = recurring task — it becomes tickable
          on the day itself.
        </p>
      )}
    </section>
  );
}

function TaskItem({
  task,
  isAdmin,
  busy,
  run,
  showFrom,
}: {
  task: TaskRow;
  isAdmin: boolean;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>, after?: () => void) => void;
  showFrom?: boolean;
}) {
  const done = task.status === "done";
  const notReq = task.status === "not_required";
  const recurring = task.templateId !== null;

  const [note, setNote] = useState(task.note ?? "");
  const [hint, setHint] = useState<string | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  // Save the note quietly on blur — no page refresh, the box already shows
  // the value. (Device keyboards' dictation mic works in this field.)
  function saveNote() {
    const next = note.trim();
    if (next === (task.note ?? "")) return;
    updateTaskNote(task.id, next).then((r) => {
      if (r?.error) setHint(r.error);
    });
  }

  if (task.isPreview) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm opacity-60">
        <span className="w-6 h-6 shrink-0 rounded-md border-2 border-dashed border-line" />
        <span className="flex-1 min-w-0">{task.title}</span>
        <span className="text-[11px] font-bold text-brand-ink shrink-0">R</span>
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-1.5 text-sm">
      <div className="flex items-start gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(done || notReq ? () => reopenTask(task.id) : () => signOffTask(task.id, note))}
          aria-label={done || notReq ? "Reopen" : "Mark done"}
          className={`mt-0.5 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center font-bold disabled:opacity-50 ${
            done
              ? "bg-ok border-ok text-white"
              : notReq
                ? "bg-gray-tint border-line text-ink-muted"
                : "border-line-cool"
          }`}
        >
          {done ? "✓" : notReq ? "–" : ""}
        </button>

        <span className={`flex-1 min-w-[8rem] ${done || notReq ? "text-ink-muted line-through" : "font-medium"}`}>
          {task.title}
          {recurring && <span className="ml-1.5 text-[11px] font-bold text-brand-ink no-underline">R</span>}
          {showFrom && (
            <span className="ml-1.5 text-xs text-warm-ink font-semibold no-underline">
              from {shortDate(task.date)}
            </span>
          )}
          {done && task.actionedByInitials && (
            <span className="ml-1.5 text-xs text-ok font-semibold no-underline">
              {task.actionedByInitials} {timeOf(task.actionedAt)}
            </span>
          )}
          {notReq && task.actionedByInitials && (
            <span className="ml-1.5 text-xs text-ink-muted no-underline">
              not needed · {task.actionedByInitials}
            </span>
          )}
        </span>

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
          className="flex-1 basis-40 min-w-0 h-8 px-2 rounded-[var(--radius)] border border-line-cool bg-white text-sm"
        />
      </div>

      <div className="flex gap-3 pl-8 text-xs font-semibold">
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
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => reopenTask(task.id))}
            className="text-ink-muted disabled:opacity-50"
          >
            Reopen
          </button>
        )}
        {isAdmin && task.templateId === null && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => deleteAdhocTask(task.id))}
            className="text-danger disabled:opacity-50"
          >
            Delete
          </button>
        )}
        {hint && <span className="text-warm-ink font-normal">{hint}</span>}
      </div>
    </div>
  );
}

function AddTask({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (title: string, done: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand-ink">
        + Add task
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim())
          onAdd(title, () => {
            setTitle("");
            setOpen(false);
          });
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task"
        className="h-9 px-2 rounded-[var(--radius)] border border-line-cool bg-white text-sm w-40"
      />
      <button
        type="submit"
        disabled={busy}
        className="h-9 px-3 rounded-[var(--radius)] bg-ok text-white font-bold text-sm disabled:opacity-50"
      >
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-muted">
        ✕
      </button>
    </form>
  );
}
