"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PART_LABEL, parseYmd, type Part, type TaskRow } from "@/lib/staff";
import {
  signOffTask,
  markTaskNotRequired,
  reopenTask,
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

  const noteRef = useRef<HTMLDialogElement>(null);
  const [dialog, setDialog] = useState<{
    id: string;
    mode: "note" | "not_required";
    title: string;
    status: TaskRow["status"];
  } | null>(null);
  const [noteText, setNoteText] = useState("");

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

  function openDialog(
    t: TaskRow,
    mode: "note" | "not_required",
  ) {
    setDialog({ id: t.id, mode, title: t.title, status: t.status });
    setNoteText(mode === "note" ? (t.note ?? "") : "");
    noteRef.current?.showModal();
  }

  const byPart = (part: Part) => tasks.today.filter((t) => t.part === part);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Tasks</h2>
      {error && <p className="text-sm text-danger">{error}</p>}

      {tasks.carriedOver.length > 0 && (
        <div className="bg-warm-tint border border-warm/40 rounded-[var(--radius)] p-3 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-warm-ink">
            Carried over — still open from earlier
          </p>
          {tasks.carriedOver.map((t) => (
            <TaskRowView
              key={t.id}
              task={t}
              isAdmin={isAdmin}
              busy={isPending}
              showFrom
              onTick={() => run(() => signOffTask(t.id, t.note ?? ""))}
              onReopen={() => run(() => reopenTask(t.id))}
              onNote={() => openDialog(t, "note")}
              onNotRequired={() => openDialog(t, "not_required")}
              onDelete={() => run(() => deleteAdhocTask(t.id))}
            />
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
                <TaskRowView
                  key={t.id}
                  task={t}
                  isAdmin={isAdmin}
                  busy={isPending}
                  onTick={() => run(() => signOffTask(t.id, t.note ?? ""))}
                  onReopen={() => run(() => reopenTask(t.id))}
                  onNote={() => openDialog(t, "note")}
                  onNotRequired={() => openDialog(t, "not_required")}
                  onDelete={() => run(() => deleteAdhocTask(t.id))}
                />
              ))
            )}
          </div>
        </div>
      ))}

      {date > today && (
        <p className="text-xs text-ink-muted">
          This is a future day — recurring tasks appear on the day itself.
        </p>
      )}

      <dialog
        ref={noteRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && noteRef.current?.close()}
      >
        {dialog && (
          <form
            className="flex flex-col gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              // "note" mode edits the note in place without changing the
              // status; "not_required" mode sets that status.
              const fn =
                dialog.mode === "not_required" || dialog.status === "not_required"
                  ? () => markTaskNotRequired(dialog.id, noteText)
                  : () => signOffTask(dialog.id, noteText);
              run(fn, () => noteRef.current?.close());
            }}
          >
            <h2 className="font-bold text-lg">
              {dialog.mode === "not_required" ? "Not needed" : "Note"}
            </h2>
            <p className="text-sm text-ink-muted">{dialog.title}</p>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder={
                dialog.mode === "not_required" ? "Why wasn't it needed?" : "Optional note"
              }
              className="px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => noteRef.current?.close()}
                className="h-10 px-4 rounded-[var(--radius)] font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={`h-10 px-4 rounded-[var(--radius)] text-white font-bold disabled:opacity-60 ${
                  dialog.mode === "not_required" ? "bg-warm-ink" : "bg-brand"
                }`}
              >
                Save
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

function TaskRowView({
  task,
  isAdmin,
  busy,
  showFrom,
  onTick,
  onReopen,
  onNote,
  onNotRequired,
  onDelete,
}: {
  task: TaskRow;
  isAdmin: boolean;
  busy: boolean;
  showFrom?: boolean;
  onTick: () => void;
  onReopen: () => void;
  onNote: () => void;
  onNotRequired: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "done";
  const notReq = task.status === "not_required";

  return (
    <div className="flex items-start gap-2 p-3 text-sm">
      <button
        type="button"
        disabled={busy}
        onClick={done || notReq ? onReopen : onTick}
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

      <div className="flex-1 min-w-0">
        <p className={done || notReq ? "text-ink-muted line-through" : "font-medium"}>{task.title}</p>

        <div className="text-xs text-ink-muted flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
          {showFrom && <span className="text-warm-ink font-semibold">from {shortDate(task.date)}</span>}
          {done && (
            <span>
              ✓ {task.actionedByInitials} · {timeOf(task.actionedAt)}
            </span>
          )}
          {notReq && <span>Not needed · {task.actionedByInitials}</span>}
          {task.note && <span className="italic">“{task.note}”</span>}
        </div>

        <div className="flex gap-3 mt-1 text-xs font-semibold">
          {!done && !notReq && (
            <button
              type="button"
              disabled={busy}
              onClick={onNotRequired}
              className="text-warm-ink disabled:opacity-50"
            >
              Not needed
            </button>
          )}
          {(done || notReq) && (
            <button type="button" disabled={busy} onClick={onNote} className="text-brand-ink disabled:opacity-50">
              {task.note ? "Edit note" : "Add note"}
            </button>
          )}
          {(done || notReq) && (
            <button type="button" disabled={busy} onClick={onReopen} className="text-ink-muted disabled:opacity-50">
              Reopen
            </button>
          )}
          {isAdmin && task.templateId === null && (
            <button type="button" disabled={busy} onClick={onDelete} className="text-danger disabled:opacity-50">
              Delete
            </button>
          )}
        </div>
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
