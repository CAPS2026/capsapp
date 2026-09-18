"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABEL, CATEGORY_ORDER, type ShiftTaskRow, type TaskCategory } from "@/lib/shift";
import { addExtraTask } from "@/lib/actions/shift";
import { Checklist } from "@/components/shift/checklist";

/** The Checklist tab's content: today's tasks by category, anything
 *  carried over from an earlier day, and off-list extras. Identity and
 *  shift status live in the sidebar (see shift-sidebar.tsx), visible
 *  from every tab, not just this one. */
export function ShiftChecklist({
  byCategory,
  carriedOver,
  extras,
}: {
  byCategory: Record<TaskCategory, ShiftTaskRow[]>;
  carriedOver: ShiftTaskRow[];
  extras: ShiftTaskRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {carriedOver.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-warm/40 bg-warm-tint p-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wide text-warm-ink">
            Carried over, still open from earlier
          </p>
          <Checklist tasks={carriedOver} busy={isPending} run={run} showFrom />
        </div>
      )}

      <div className="columns-1 gap-4 lg:columns-2">
        {CATEGORY_ORDER.map((cat) => (
          <details
            key={cat}
            className="mb-4 inline-block w-full break-inside-avoid rounded-[var(--radius)] border border-line bg-card align-top"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-3">
              <span className="font-bold">{CATEGORY_LABEL[cat]}</span>
              <span className="text-xs font-bold text-ink-muted">
                {byCategory[cat].filter((t) => t.status !== "open").length}/{byCategory[cat].length}
              </span>
            </summary>
            <div className="border-t border-line">
              {byCategory[cat].length === 0 ? (
                <p className="p-3 text-sm text-ink-muted">Nothing in this section.</p>
              ) : (
                <Checklist tasks={byCategory[cat]} busy={isPending} run={run} />
              )}
            </div>
          </details>
        ))}

        <div className="mb-4 inline-block w-full break-inside-avoid align-top">
          <ExtrasSection extras={extras} busy={isPending} run={run} />
        </div>
      </div>
    </div>
  );
}

function ExtrasSection({
  extras,
  busy,
  run,
}: {
  extras: ShiftTaskRow[];
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Extra, off the checklist</h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand-ink">
            + Add
          </button>
        )}
      </div>

      {open && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            run(() =>
              addExtraTask(title).then((r) => {
                if (!r.error) {
                  setTitle("");
                  setOpen(false);
                }
                return r;
              }),
            );
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you do?"
            className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm"
          />
          <button type="submit" disabled={busy} className="h-9 rounded-[var(--radius)] bg-ok px-3 text-sm font-bold text-white disabled:opacity-50">
            Add
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-muted">
            &#10005;
          </button>
        </form>
      )}

      {extras.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing extra logged today.</p>
      ) : (
        <div className="rounded-[var(--radius)] border border-line bg-card">
          <Checklist tasks={extras} busy={busy} run={run} />
        </div>
      )}
      <p className="text-xs leading-relaxed text-ink-muted">
        For anything you do that isn&rsquo;t on the standard list. It still shows up in the handover log.
      </p>
    </div>
  );
}
