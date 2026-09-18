"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PART_LABEL, type OpenShift } from "@/lib/shift";
import { endShift, setLateReason, switchPerson } from "@/lib/actions/shift";

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

export function ShiftSidebar({
  person,
  shift,
  sessionEnds,
  autocloseGraceMinutes,
  latestHandover,
}: {
  person: { id: string; name: string } | null;
  shift: OpenShift | null;
  sessionEnds: string | null;
  autocloseGraceMinutes: number;
  latestHandover: { personName: string; body: string } | null;
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
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-card p-4">
      <div className="flex items-center gap-2">
        <Image src="/logo.jpg" alt="" width={26} height={26} className="rounded-full" />
        <span className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          CAPS Staff
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {person && shift && sessionEnds ? (
        <ShiftStatus
          person={person}
          shift={shift}
          sessionEnds={sessionEnds}
          autocloseGraceMinutes={autocloseGraceMinutes}
          busy={isPending}
          run={run}
        />
      ) : (
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line-cool bg-brand-tint p-3.5">
          <p className="text-sm font-bold">Nobody signed in yet</p>
          <p className="text-xs text-ink-muted">Go to the Checklist tab and tap your name.</p>
        </div>
      )}

      {latestHandover && (
        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-[#F0D69A] bg-warm-tint p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-warm-ink">Latest handover</p>
          <p className="text-xs leading-relaxed text-ink">{latestHandover.body}</p>
          <p className="text-[10.5px] font-semibold text-ink-muted">{latestHandover.personName}</p>
        </div>
      )}

      {person && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => switchPerson().then(() => ({})))}
          className="mt-auto text-left text-sm font-semibold text-brand-ink disabled:opacity-50"
        >
          Switch person
        </button>
      )}
    </aside>
  );
}

function ShiftStatus({
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
      <p className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        {person.name} &middot; {PART_LABEL[shift.part]} shift
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{isOver ? "Over by" : "Time left"}</p>
      <p className={`font-mono text-2xl font-extrabold tabular-nums ${isOver ? overColor : "text-brand-ink"}`}>
        {formatDuration(Math.abs(minutesToEnd))}
      </p>
      <p className="text-xs text-ink-muted">
        Signed in {startedAt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
        {shift.lateMinutes ? ` · ${shift.lateMinutes} min late` : ""}
        {!shift.rostered ? " · not on today's roster" : ""}
      </p>

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

      <button
        type="button"
        disabled={busy}
        onClick={() => run(endShift)}
        className="h-10 rounded-[var(--radius)] border-2 border-danger text-sm font-extrabold text-danger disabled:opacity-50"
      >
        End shift
      </button>
    </div>
  );
}
