"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PART_LABEL,
  WEEKDAYS,
  describeRepeat,
  type Part,
  type RepeatKind,
  type TaskTemplateRow,
} from "@/lib/staff";
import {
  createTaskTemplate,
  updateTaskTemplate,
  setTemplateActive,
  deleteTaskTemplate,
} from "@/lib/actions/staff";

type Draft = {
  title: string;
  part: Part;
  repeat: RepeatKind;
  weekdays: number[];
  dayOfMonth: number | null;
};

const EMPTY: Draft = { title: "", part: "morning", repeat: "daily", weekdays: [], dayOfMonth: 1 };

export function TemplateManager({ templates }: { templates: TaskTemplateRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  const active = templates.filter((t) => t.active);
  const inactive = templates.filter((t) => !t.active);

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {(["morning", "afternoon"] as Part[]).map((part) => {
        const rows = active.filter((t) => t.part === part);
        return (
          <section key={part} className="flex flex-col gap-2">
            <h2 className="font-bold">{PART_LABEL[part]}</h2>
            <div className="bg-card border border-line rounded-[var(--radius)] divide-y divide-line">
              {rows.length === 0 && (
                <p className="text-sm text-ink-muted p-3">No recurring {PART_LABEL[part].toLowerCase()} tasks.</p>
              )}
              {rows.map((t) =>
                editingId === t.id ? (
                  <TemplateForm
                    key={t.id}
                    busy={isPending}
                    initial={{
                      title: t.title,
                      part: t.part,
                      repeat: t.repeat,
                      weekdays: t.weekdays,
                      dayOfMonth: t.dayOfMonth ?? 1,
                    }}
                    onSave={(d) => run(() => updateTaskTemplate(t.id, d), () => setEditingId(null))}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div key={t.id} className="p-3 flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-ink-muted">{describeRepeat(t)}</p>
                    </div>
                    <div className="flex gap-3 shrink-0 text-xs font-semibold">
                      <button type="button" onClick={() => setEditingId(t.id)} className="text-brand-ink">
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => setTemplateActive(t.id, false))}
                        className="text-ink-muted disabled:opacity-50"
                      >
                        Pause
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}

      {adding ? (
        <TemplateForm
          busy={isPending}
          initial={EMPTY}
          onSave={(d) => run(() => createTaskTemplate(d), () => setAdding(false))}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-11 px-4 rounded-[var(--radius)] bg-ok text-white font-bold self-start"
        >
          + New recurring task
        </button>
      )}

      {inactive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Paused</h2>
          <div className="bg-card border border-line rounded-[var(--radius)] divide-y divide-line">
            {inactive.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-ink-muted">{t.title}</p>
                  <p className="text-xs text-ink-muted">
                    {PART_LABEL[t.part]} · {describeRepeat(t)}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 text-xs font-semibold">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => setTemplateActive(t.id, true))}
                    className="text-brand-ink disabled:opacity-50"
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (confirm(`Delete "${t.title}" for good?`)) run(() => deleteTaskTemplate(t.id));
                    }}
                    className="text-danger disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TemplateForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  busy: boolean;
  onSave: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggleDay = (n: number) =>
    set("weekdays", d.weekdays.includes(n) ? d.weekdays.filter((x) => x !== n) : [...d.weekdays, n]);

  return (
    <form
      className="p-3 flex flex-col gap-3 bg-card border border-brand/40 rounded-[var(--radius)]"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(d);
      }}
    >
      <input
        autoFocus
        value={d.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Task name"
        className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base"
      />

      <div className="flex gap-2">
        {(["morning", "afternoon"] as Part[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set("part", p)}
            className={`h-9 px-3 rounded-full text-sm font-semibold border ${
              d.part === p ? "bg-brand text-white border-brand" : "border-line-cool text-ink-muted"
            }`}
          >
            {PART_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["daily", "weekly", "monthly"] as RepeatKind[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => set("repeat", r)}
            className={`h-9 px-3 rounded-full text-sm font-semibold border ${
              d.repeat === r ? "bg-brand text-white border-brand" : "border-line-cool text-ink-muted"
            }`}
          >
            {r === "daily" ? "Every day" : r === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {d.repeat === "weekly" && (
        <div className="flex gap-1 flex-wrap">
          {WEEKDAYS.map((w, n) => (
            <button
              key={w}
              type="button"
              onClick={() => toggleDay(n)}
              className={`w-11 h-9 rounded-[var(--radius)] text-sm font-semibold border ${
                d.weekdays.includes(n)
                  ? "bg-brand text-white border-brand"
                  : "border-line-cool text-ink-muted"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {d.repeat === "monthly" && (
        <label className="flex items-center gap-2 text-sm">
          Day of the month
          <input
            type="number"
            min={1}
            max={31}
            value={d.dayOfMonth ?? 1}
            onChange={(e) => set("dayOfMonth", Number(e.target.value) || 1)}
            className="h-9 w-20 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
          />
          <span className="text-ink-muted text-xs">29–31 fall on the last day of shorter months</span>
        </label>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="h-10 px-4 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </form>
  );
}
