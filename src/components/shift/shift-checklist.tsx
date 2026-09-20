"use client";

import { useState, useTransition } from "react";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_STYLE,
  type ShiftTaskRow,
  type TaskCategory,
} from "@/lib/shift";
import { addExtraTask } from "@/lib/actions/shift";
import { Checklist } from "@/components/shift/checklist";

/** The Checklist tab's content: today's tasks by category, each section
 *  colour-coded, anything carried over from an earlier day sitting inside
 *  its own section (tinted, tagged "from Fri"), and off-list extras.
 *  Identity and shift status live in the sidebar, visible from every tab. */
export function ShiftChecklist({
  byCategory,
  carriedOver,
  extras,
}: {
  byCategory: Record<TaskCategory, ShiftTaskRow[]>;
  carriedOver: ShiftTaskRow[];
  extras: ShiftTaskRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // No router.refresh() afterwards: every checklist action already
  // revalidates /shift, which sends the fresh page back in the same
  // response. Refreshing again as well made the server rebuild the whole
  // page a second time for nothing, which was most of the lag on a tick.
  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
    });
  };

  // Carried-over tasks go in with their own category's tasks, oldest
  // first, like the mockup. Only ones with no category at all (very rare)
  // fall back to a box of their own at the top.
  const carriedByCategory = new Map<TaskCategory, ShiftTaskRow[]>();
  const carriedUncategorised: ShiftTaskRow[] = [];
  for (const t of carriedOver) {
    if (!t.category) {
      carriedUncategorised.push(t);
      continue;
    }
    carriedByCategory.set(t.category, [...(carriedByCategory.get(t.category) ?? []), t]);
  }

  return (
    <div className="flex max-w-5xl flex-col gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}

      {carriedUncategorised.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[#F0D69A] bg-warm-tint">
          <p className="px-3 pt-2.5 text-[11px] font-extrabold uppercase tracking-wide text-warm-ink">
            Carried over, still open from earlier
          </p>
          <Checklist tasks={carriedUncategorised} busy={isPending} run={run} />
        </div>
      )}

      <div className="columns-1 gap-3 lg:columns-2">
        {CATEGORY_ORDER.map((cat) => {
          const rows = [...(carriedByCategory.get(cat) ?? []), ...byCategory[cat]];
          const doneCount = rows.filter((t) => t.status !== "open").length;
          const complete = rows.length > 0 && doneCount === rows.length;
          const style = CATEGORY_STYLE[cat];
          return (
            <details
              key={cat}
              className="group mb-2.5 inline-block w-full break-inside-avoid overflow-hidden rounded-[var(--radius)] border border-line bg-card align-top"
              style={{ borderLeft: `4px solid ${style.accent}` }}
              open
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden"
                style={{ background: style.tint }}
              >
                <span className="text-sm font-extrabold" style={{ color: style.ink }}>
                  {CATEGORY_LABEL[cat]}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-px text-[11px] font-extrabold tabular-nums text-white"
                    style={{ background: complete ? "var(--ok)" : style.accent }}
                  >
                    {doneCount}/{rows.length}
                  </span>
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-line">
                {rows.length === 0 ? (
                  <p className="p-3 text-sm text-ink-muted">Nothing in this section.</p>
                ) : (
                  <Checklist tasks={rows} busy={isPending} run={run} />
                )}
              </div>
            </details>
          );
        })}

        <div className="mb-2.5 inline-block w-full break-inside-avoid align-top">
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-ink-muted">
          Extra, off the checklist
        </h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-bold text-brand-ink">
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
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-muted" aria-label="Cancel">
            &#10005;
          </button>
        </form>
      )}

      {extras.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius)] border border-line bg-card">
          <Checklist tasks={extras} busy={busy} run={run} />
        </div>
      )}
      <p className="m-0 mx-0.5 text-[11px] leading-relaxed text-ink-muted">
        {extras.length === 0 ? "Nothing extra logged yet. " : ""}For anything a caretaker does that isn&rsquo;t on the
        standard list. It still lands in this shift&rsquo;s email, tagged EXTRA.
      </p>
    </div>
  );
}
