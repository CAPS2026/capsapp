"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  PART_LABEL,
  type OpenShift,
  type ShiftTaskRow,
  type TaskCategory,
} from "@/lib/shift";
import { addExtraTask, endShift, setLateReason, switchPerson } from "@/lib/actions/shift";
import { Checklist } from "@/components/shift/checklist";

export function ShiftHome({
  person,
  shift,
  sessionEnds,
  autocloseGraceMinutes,
  byCategory,
  carriedOver,
  extras,
}: {
  person: { id: string; name: string };
  shift: OpenShift;
  sessionEnds: string;
  autocloseGraceMinutes: number;
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
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 p-4 pb-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="" width={26} height={26} className="rounded-full" />
          <span className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            CAPS Staff
          </span>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => switchPerson().then(() => ({})))}
          className="text-sm font-semibold text-brand-ink disabled:opacity-50"
        >
          Switch person
        </button>
      </header>

      <nav className="flex gap-4 border-b border-line pb-2 text-sm font-bold">
        <span className="text-brand-ink">Checklist</span>
        <Link href="/shift/roster" className="text-ink-muted">
          Roster
        </Link>
        <Link href="/shift/handover" className="text-ink-muted">
          Handover log
        </Link>
      </nav>

      {error && <p className="text-sm text-danger">{error}</p>}

      <ShiftStatusCard
        person={person}
        shift={shift}
        sessionEnds={sessionEnds}
        autocloseGraceMinutes={autocloseGraceMinutes}
        busy={isPending}
        run={run}
      />

      {carriedOver.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-warm/40 bg-warm-tint p-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wide text-warm-ink">
            Carried over, still open from earlier
          </p>
          <Checklist tasks={carriedOver} busy={isPending} run={run} showFrom />
        </div>
      )}

      {CATEGORY_ORDER.map((cat) => (
        <details key={cat} className="rounded-[var(--radius)] border border-line bg-card" open>
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

      <ExtrasSection extras={extras} busy={isPending} run={run} />
    </div>
  );
}

/** "Xh Ym" (or just "Ym" under an hour). */
function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
}

/** The shift's rostered end, as a real instant. Brisbane has no daylight
 *  saving, so "+10:00" is always correct, no timezone library needed. */
function sessionEndInstant(date: string, sessionEnds: string): Date {
  return new Date(`${date}T${sessionEnds}:00+10:00`);
}

function ShiftStatusCard({
  person,
  shift,
  sessionEnds,
  autocloseGraceMinutes,
  busy,
  run,
}: {
  person: { id: string; name: string };
  shift: OpenShift;
  sessionEnds: string;
  autocloseGraceMinutes: number;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  const [reason, setReason] = useState(shift.lateReason ?? "");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const startedAt = new Date(shift.startedAt);
  const endInstant = sessionEndInstant(shift.date, sessionEnds);
  const minutesToEnd = (endInstant.getTime() - now.getTime()) / 60000;
  const isOver = minutesToEnd <= 0;
  // Amber once over time, red once deep enough into overrun that
  // auto-close would apply to a genuinely quiet shift, so the colour
  // means something rather than just escalating for its own sake.
  const overColor = -minutesToEnd >= autocloseGraceMinutes ? "text-danger" : "text-warm-ink";

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line-cool bg-brand-tint p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            {person.name} &middot; {PART_LABEL[shift.part]} shift
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            {isOver ? "Over by" : "Time left"}
          </p>
          <p className={`font-mono text-2xl font-extrabold tabular-nums ${isOver ? overColor : "text-brand-ink"}`}>
            {formatDuration(Math.abs(minutesToEnd))}
          </p>
          <p className="text-xs text-ink-muted">
            Signed in {startedAt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
            {shift.lateMinutes ? ` · ${shift.lateMinutes} min late` : ""}
            {!shift.rostered ? " · not on today's roster" : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(endShift)}
          className="h-10 shrink-0 rounded-[var(--radius)] border-2 border-danger px-3 text-sm font-extrabold text-danger disabled:opacity-50"
        >
          End shift
        </button>
      </div>

      {shift.lateMinutes && !shift.lateReason && (
        <div className="flex items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for being late (optional)"
            className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-line-cool bg-white px-2 text-sm"
          />
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => run(() => setLateReason(reason))}
            className="h-9 shrink-0 rounded-[var(--radius)] bg-ok px-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}
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
            ✕
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
