"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MEDS_STYLE,
  PART_LABEL,
  PART_STYLE,
  clockTime,
  hhmm,
  sessionInstant,
  timeRange,
  type OpenShift,
  type Part,
} from "@/lib/shift";
import { endShift, getEndOfShiftLeft, setVolunteerCount, switchPerson, type EndOfShiftTask } from "@/lib/actions/shift";
import type { RosterDaySession } from "@/lib/shift-data";
import type { VetAppointment } from "@/lib/care-data";
import { formatLeaveDates } from "@/lib/leave";
import { EmailPreviewLink } from "@/components/shift/email-preview";
import { PersonAvatar } from "@/components/shift/person-avatar";
import { EndEarlyDialog, EndOfShiftDialog, ExtendShiftDialog, HealthConcernDialog } from "@/components/shift/shift-dialogs";

const SITE_LABEL = "Evans Landing";

// Colours chosen by Julie so none of them matches a checklist section.
const HANDOVER_BG = "#FFE27A";
const HANDOVER_BORDER = "#D9A800";
const HANDOVER_INK = "#4A3A00";
const HEALTH_ORANGE = "#F26B1D";
const SWITCH_OLIVE = "#6B7A1F";
const END_RED = "#C8102E";

/** "Xh Ym" (or just "Ym" under an hour). */
function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
}

/** 240 -> "4 hours", 90 -> "1 hour 30 minutes", 45 -> "45 minutes". */
function formatGrace(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hours = h > 0 ? `${h} hour${h === 1 ? "" : "s"}` : "";
  const mins = m > 0 ? `${m} minute${m === 1 ? "" : "s"}` : "";
  return [hours, mins].filter(Boolean).join(" ");
}

/** Only ever mounted once someone's actually signed in, see the "active
 *  && openShift && session" check in layout.tsx. */
export function ShiftSidebar({
  person,
  shift,
  session,
  alsoOn,
  autocloseGraceMinutes,
  lateAfterMinutes,
  todayRoster,
  leaveNotices,
  volunteerCount,
  vetToday,
  openHandoverCount,
}: {
  person: { id: string; name: string };
  shift: OpenShift;
  session: { starts: string; ends: string };
  /** First names of anyone else rostered on the same session. */
  alsoOn: string[];
  autocloseGraceMinutes: number;
  /** Grace period in minutes: finishing early is only flagged (and a
   *  reason required) beyond it. */
  lateAfterMinutes: number;
  todayRoster: RosterDaySession[];
  /** Leave decisions to show once, on the first shift after they were made. */
  leaveNotices: { id: string; status: "approved" | "declined"; startDate: string; endDate: string; message: string | null }[];
  /** How many volunteers came this shift, null until someone enters it. */
  volunteerCount: number | null;
  /** Today's vet appointments. */
  vetToday: VetAppointment[];
  /** Handover notes not ticked off yet. */
  openHandoverCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };

  // End shift: any unticked End of Shift tasks first (tick or say why), then
  // the volunteer count (if nobody has entered it), then a reason if it is
  // more than the grace period early, then end.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const endsAtMs = sessionInstant(shift.date, session.ends).getTime() + (shift.extendedMinutes ?? 0) * 60000;
  const minutesToEnd = (endsAtMs - now.getTime()) / 60000;
  const [volunteersOpen, setVolunteersOpen] = useState(false);
  const [endEarlyOpen, setEndEarlyOpen] = useState(false);

  function finish() {
    if (minutesToEnd > lateAfterMinutes) setEndEarlyOpen(true);
    else run(() => endShift());
  }
  function askVolunteers() {
    if (volunteerCount === null) setVolunteersOpen(true);
    else finish();
  }
  const [endOfShiftTasks, setEndOfShiftTasks] = useState<EndOfShiftTask[] | null>(null);
  function startEnd() {
    setError(null);
    startTransition(async () => {
      const r = await getEndOfShiftLeft();
      if (!("tasks" in r)) setError(r.error);
      else if (r.tasks.length) setEndOfShiftTasks(r.tasks);
      else askVolunteers();
    });
  }

  const btn =
    "flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] px-2.5 font-extrabold text-white disabled:opacity-50";

  return (
    <aside className="flex w-[clamp(300px,28vw,340px)] shrink-0 flex-col gap-3.5 overflow-y-auto border-r border-line bg-card px-3.5 py-4">
      <div className="flex items-center gap-2">
        <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-full" />
        <div>
          <div className="text-[15px] font-extrabold leading-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            CAPS Staff
          </div>
          <div className="text-[10px] font-bold uppercase leading-tight tracking-[0.03em] text-brand-ink">{SITE_LABEL}</div>
        </div>
      </div>

      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}

      <ShiftCard
        person={person}
        shift={shift}
        session={session}
        alsoOn={alsoOn}
        autocloseGraceMinutes={autocloseGraceMinutes}
        minutesToEnd={minutesToEnd}
        volunteerCount={volunteerCount}
        busy={isPending}
        run={run}
        onChanged={() => router.refresh()}
      />

      {vetToday.length > 0 && <VetToday appts={vetToday} />}

      {leaveNotices.map((n) => (
        <LeaveNotice key={n.id} notice={n} />
      ))}

      {openHandoverCount > 0 && (
        <Link
          href="/shift/handover"
          className="flex w-full items-center justify-center rounded-[var(--radius)] border-2 px-2.5 py-3 text-center text-[17px] font-extrabold leading-snug"
          style={{ background: HANDOVER_BG, borderColor: HANDOVER_BORDER, color: HANDOVER_INK }}
        >
          Check the handover log now ({openHandoverCount})
        </Link>
      )}

      <EmailPreviewLink part={shift.part} />

      <TodayRoster sessions={todayRoster} />

      <div className="mt-auto flex flex-col gap-2.5">
        <button type="button" onClick={() => setHealthOpen(true)} className={`${btn} py-[13px] text-[19px]`} style={{ background: HEALTH_ORANGE }}>
          <svg className="shrink-0" width="17" height="24" viewBox="3.5 2 15 21" aria-hidden="true">
            <path d="M5 22V3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M5 4h12l-2.5 4.5L17 13H5z" fill="#fff" />
          </svg>
          Flag a health concern
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => switchPerson().then(() => ({})))}
          className={`${btn} py-[13px] text-[19px]`}
          style={{ background: SWITCH_OLIVE }}
        >
          <svg className="shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h14l-4-4" />
            <path d="M20 16H6l4 4" />
          </svg>
          Switch person
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={startEnd}
          className={`${btn} py-[15px] text-[23px] tracking-[0.06em]`}
          style={{ background: END_RED }}
        >
          END SHIFT
        </button>
      </div>

      {healthOpen && <HealthConcernDialog onClose={() => setHealthOpen(false)} />}
      {endOfShiftTasks && (
        <EndOfShiftDialog
          tasks={endOfShiftTasks}
          onClose={() => setEndOfShiftTasks(null)}
          onSaved={() => {
            setEndOfShiftTasks(null);
            askVolunteers();
          }}
        />
      )}
      {volunteersOpen && (
        <VolunteersDialog
          onClose={() => setVolunteersOpen(false)}
          onSaved={() => {
            setVolunteersOpen(false);
            finish();
          }}
        />
      )}
      {endEarlyOpen && (
        <EndEarlyDialog
          minutesEarly={Math.round(minutesToEnd)}
          onClose={() => setEndEarlyOpen(false)}
          onEnded={() => {
            setEndEarlyOpen(false);
            router.refresh();
          }}
        />
      )}
    </aside>
  );
}

function ShiftCard({
  person,
  shift,
  session,
  alsoOn,
  autocloseGraceMinutes,
  minutesToEnd,
  volunteerCount,
  busy,
  run,
  onChanged,
}: {
  person: { id: string; name: string };
  shift: OpenShift;
  session: { starts: string; ends: string };
  alsoOn: string[];
  autocloseGraceMinutes: number;
  minutesToEnd: number;
  volunteerCount: number | null;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
  onChanged: () => void;
}) {
  const [extendOpen, setExtendOpen] = useState(false);
  const style = PART_STYLE[shift.part];
  const isOver = minutesToEnd <= 0;
  // Amber once over time, red once deep enough into overrun that
  // auto-close would apply to a genuinely quiet shift.
  const overColor = -minutesToEnd >= autocloseGraceMinutes ? "text-danger" : "text-warm-ink";
  // From 15 minutes before the finish, and after it, until they extend: say
  // plainly what happens next and point at the extend button.
  const nudgeToExtend = !shift.extendedMinutes && minutesToEnd <= 15;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border-2 p-3.5" style={{ borderColor: style.accent, background: style.tint }}>
      <div>
        <div className="text-[17px] font-extrabold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {person.name.split(/\s+/)[0]}
        </div>
        <div className="text-[13px] font-extrabold tabular-nums tracking-[0.03em]" style={{ color: style.ink }}>
          {PART_LABEL[shift.part].toUpperCase()} SHIFT {timeRange(session.starts, session.ends)}
        </div>
        {(alsoOn.length > 0 || !shift.rostered) && (
          <div className="text-[11.5px] font-semibold text-ink-muted">
            {alsoOn.length > 0 ? `Also on: ${alsoOn.join(", ")}` : ""}
            {alsoOn.length > 0 && !shift.rostered ? ". " : ""}
            {!shift.rostered ? "Covering, not on the roster" : ""}
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-ink-muted">{isOver ? "Over by" : "Time left"}</div>
        <div
          suppressHydrationWarning
          className={`text-[26px] font-extrabold leading-[1.25] tabular-nums ${isOver ? overColor : "text-foreground"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatDuration(Math.abs(minutesToEnd))}
        </div>
        <div className="text-[11px] text-ink-muted">
          signed in {clockTime(shift.startedAt)}
          {shift.lateMinutes ? `, ${shift.lateMinutes} min late` : ""}
        </div>
      </div>

      <VolunteerCounter count={volunteerCount} busy={busy} run={run} />

      {nudgeToExtend && (
        <div className="rounded-md border border-[#F0D69A] bg-warm-tint px-2.5 py-2 text-[11.5px] font-semibold leading-snug text-warm-ink">
          {isOver ? `Your shift time was up at ${hhmm(session.ends)}.` : `Your shift finishes at ${hhmm(session.ends)}.`} Still working? Tap
          &ldquo;Need to extend the shift time?&rdquo; below. If nothing is ticked for {formatGrace(autocloseGraceMinutes)} after the
          finish time, the shift closes by itself.
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => setExtendOpen(true)}
        className={
          nudgeToExtend
            ? "h-[38px] rounded-[var(--radius)] border-[1.5px] border-[#C1800F] bg-card text-[12.5px] font-extrabold text-warm-ink disabled:opacity-50"
            : "text-left text-[12px] font-bold text-brand-ink disabled:opacity-50"
        }
      >
        {shift.extendedMinutes ? `Extended by ${shift.extendedMinutes} min, change` : "Need to extend the shift time?"}
      </button>

      {extendOpen && (
        <ExtendShiftDialog
          onClose={() => setExtendOpen(false)}
          onSaved={() => {
            setExtendOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/** "Number of volunteers this shift", minus and plus. One number for the
 *  whole shift, saved straight away. */
function VolunteerCounter({
  count,
  busy,
  run,
}: {
  count: number | null;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  const shown = count ?? 0;
  const round =
    "flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-brand bg-card text-lg font-extrabold text-brand-ink disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-2 rounded-[10px] border border-line-cool bg-card px-2.5 py-2">
      <div className="max-w-[12ch] text-[13px] font-extrabold leading-tight">Number of volunteers this shift</div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="One fewer"
          disabled={busy || shown === 0}
          onClick={() => run(() => setVolunteerCount(shown - 1))}
          className={round}
        >
          &minus;
        </button>
        <span className="min-w-[2ch] text-center text-[22px] font-extrabold tabular-nums">{count === null ? "-" : count}</span>
        <button type="button" aria-label="One more" disabled={busy} onClick={() => run(() => setVolunteerCount(shown + 1))} className={round}>
          +
        </button>
      </div>
    </div>
  );
}

/** Asked at End shift when nobody has entered the volunteer count. 0 is
 *  fine and needs no reason. Doesn't close on a click outside. */
function VolunteersDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [n, setN] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const round =
    "flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-brand bg-card text-xl font-extrabold text-brand-ink disabled:opacity-40";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Volunteers this shift"
        className="flex w-full max-w-[420px] flex-col gap-3 rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      >
        <h2 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          How many volunteers came this shift?
        </h2>
        <p className="m-0 text-sm text-ink-muted">Put 0 if nobody came.</p>
        <div className="flex items-center justify-center gap-5">
          <button type="button" aria-label="One fewer" className={round} disabled={n === 0} onClick={() => setN((x) => Math.max(0, x - 1))}>
            &minus;
          </button>
          <span className="min-w-[2ch] text-center text-3xl font-extrabold tabular-nums">{n}</span>
          <button type="button" aria-label="One more" className={round} onClick={() => setN((x) => x + 1)}>
            +
          </button>
        </div>
        {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const r = await setVolunteerCount(n);
                if (r.error) setError(r.error);
                else onSaved();
              })
            }
            className="h-11 flex-1 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save and end shift"}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

/** Today's vet appointments, bold so they aren't missed. */
function VetToday({ appts }: { appts: VetAppointment[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border-2 px-3 py-2.5" style={{ borderColor: MEDS_STYLE.accent, background: MEDS_STYLE.tint }}>
      <div className="text-[15px] font-extrabold uppercase tracking-[0.05em]" style={{ color: MEDS_STYLE.ink }}>
        Vet today
      </div>
      {appts.map((a) => (
        <div key={a.id} className="text-sm font-extrabold leading-snug text-foreground">
          {a.dogName}: {a.time ? hhmm(a.time) : a.part} {a.kind === "other" ? "appointment" : a.kind}
          {a.reason ? <div>{a.reason}</div> : null}
          {a.instructions ? <div>{a.instructions}</div> : null}
        </div>
      ))}
    </div>
  );
}

const PART_ORDER: Part[] = ["morning", "afternoon"];

/** Who's on today, session by session, with "unstaffed" spelled out. */
function TodayRoster({ sessions }: { sessions: RosterDaySession[] }) {
  const byPart = new Map(sessions.map((s) => [s.part, s]));
  return (
    <div>
      <h2 className="m-0 mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-ink-muted">Today&rsquo;s roster</h2>
      <div>
        {PART_ORDER.map((part) => {
          const s = byPart.get(part);
          if (!s || s.attendees.length === 0) {
            return (
              <p key={part} className="m-0 border-t border-line py-[5px] text-xs font-semibold text-ink-muted first:border-0">
                {PART_LABEL[part]}: unstaffed
              </p>
            );
          }
          return s.attendees.map((a) => (
            <div key={`${part}-${a.id}`} className="flex items-center justify-between border-t border-line py-[5px] text-xs first:border-0">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <PersonAvatar name={a.full} size={24} />
                {a.first}
              </span>
              <span className="text-ink-muted">{timeRange(s.starts, s.ends)}</span>
            </div>
          ));
        })}
      </div>
    </div>
  );
}

/** A leave decision, shown once: the first shift after Shayna decided. */
function LeaveNotice({
  notice,
}: {
  notice: { status: "approved" | "declined"; startDate: string; endDate: string; message: string | null };
}) {
  const approved = notice.status === "approved";
  return (
    <div
      className={`flex flex-col gap-1 rounded-[var(--radius)] border px-3 py-2.5 ${
        approved ? "border-[#BFE0CE] bg-[#E9F5EF]" : "border-[#F0C4B8] bg-[#FCEDE8]"
      }`}
    >
      <span className={`text-[10px] font-extrabold uppercase tracking-[0.05em] ${approved ? "text-ok" : "text-[#9A3A26]"}`}>
        Leave {approved ? "approved" : "declined"}
      </span>
      <p className="m-0 text-xs font-semibold text-foreground">{formatLeaveDates(notice.startDate, notice.endDate)}</p>
      {notice.message && <p className="m-0 text-xs text-foreground">&quot;{notice.message}&quot;</p>}
    </div>
  );
}
