"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PART_LABEL,
  clock12,
  firstName,
  parseYmd,
  sessionInstant,
  timeRange,
  type OpenShift,
  type Part,
} from "@/lib/shift";
import { endShift, switchPerson } from "@/lib/actions/shift";
import type { RosterDaySession } from "@/lib/shift-data";
import { EmailPreviewLink } from "@/components/shift/email-preview";
import { PersonAvatar } from "@/components/shift/person-avatar";
import { EndEarlyDialog, ExtendShiftDialog, HealthConcernDialog } from "@/components/shift/shift-dialogs";

const SITE_LABEL = "Evans Landing";

/** "Xh Ym" (or just "Ym" under an hour). */
function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
}

/** Only ever mounted once someone's actually signed in, see the "active
 *  && openShift && session" check in layout.tsx. No "nobody signed in"
 *  fallback state here on purpose, that's what NOT showing this sidebar
 *  at all is for. */
export function ShiftSidebar({
  person,
  shift,
  session,
  alsoOn,
  autocloseGraceMinutes,
  lateAfterMinutes,
  radiusM,
  latestHandover,
  todayRoster,
}: {
  person: { id: string; name: string };
  shift: OpenShift;
  session: { starts: string; ends: string };
  /** First names of anyone else rostered on the same session. */
  alsoOn: string[];
  autocloseGraceMinutes: number;
  /** Grace period in minutes: lateness and finishing early are only
   *  flagged (and a reason required) beyond it. */
  lateAfterMinutes: number;
  /** How close counts as "on site", metres. */
  radiusM: number;
  latestHandover: { personName: string; body: string; part: Part; date: string } | null;
  todayRoster: RosterDaySession[];
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

  return (
    <aside className="flex w-[clamp(260px,26vw,340px)] shrink-0 flex-col gap-3.5 overflow-y-auto border-r border-line bg-card px-3.5 py-4">
      <div className="flex items-center gap-2">
        <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-full" />
        <div>
          <div className="text-[15px] font-extrabold leading-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            CAPS Staff
          </div>
          <div className="text-[10px] font-bold uppercase leading-tight tracking-[0.03em] text-brand-ink">{SITE_LABEL}</div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <ShiftStatus
        person={person}
        shift={shift}
        session={session}
        alsoOn={alsoOn}
        autocloseGraceMinutes={autocloseGraceMinutes}
        lateAfterMinutes={lateAfterMinutes}
        radiusM={radiusM}
        busy={isPending}
        run={run}
        onEnded={() => router.refresh()}
      />

      <button
        type="button"
        onClick={() => setHealthOpen(true)}
        className="flex h-[42px] items-center justify-center gap-2 rounded-[var(--radius)] bg-danger text-[13px] font-extrabold text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        Flag a health concern
      </button>
      {healthOpen && <HealthConcernDialog onClose={() => setHealthOpen(false)} />}

      <EmailPreviewLink part={shift.part} />

      {latestHandover && <HandoverBanner note={latestHandover} />}

      <TodayRoster sessions={todayRoster} />

      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => switchPerson().then(() => ({})))}
        className="mt-auto flex items-center gap-2 text-left text-sm font-bold text-brand-ink disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
        Switch person
      </button>
    </aside>
  );
}

function ShiftStatus({
  person,
  shift,
  session,
  alsoOn,
  autocloseGraceMinutes,
  lateAfterMinutes,
  radiusM,
  busy,
  run,
  onEnded,
}: {
  person: { id: string; name: string };
  shift: OpenShift;
  session: { starts: string; ends: string };
  alsoOn: string[];
  autocloseGraceMinutes: number;
  lateAfterMinutes: number;
  radiusM: number;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
  onEnded: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [endEarlyOpen, setEndEarlyOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // The finish time counts any overtime already logged with "Extend shift".
  const endsAtMs = sessionInstant(shift.date, session.ends).getTime() + (shift.extendedMinutes ?? 0) * 60000;
  const minutesToEnd = (endsAtMs - now.getTime()) / 60000;
  const isOver = minutesToEnd <= 0;
  // Amber once over time, red once deep enough into overrun that
  // auto-close would apply to a genuinely quiet shift, so the colour
  // means something rather than just escalating for its own sake.
  const overColor = -minutesToEnd >= autocloseGraceMinutes ? "text-danger" : "text-warm-ink";

  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius)] border border-line-cool p-3.5"
      style={{ background: "linear-gradient(180deg, var(--brand-tint), var(--card) 70%)" }}
    >
      <div>
        <div className="text-[15px] font-extrabold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {PART_LABEL[shift.part]} shift
        </div>
        <div className="text-[11.5px] font-semibold text-ink-muted">
          {timeRange(session.starts, session.ends)}
          {alsoOn.length > 0 ? ` · also on: ${alsoOn.join(", ")}` : ""}
          {!shift.rostered ? " · covering, not on the roster" : ""}
        </div>
      </div>

      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#E9F5EF] px-2 py-0.5 text-[10.5px] font-extrabold text-ok">
        <span className="h-1.5 w-1.5 rounded-full bg-ok motion-safe:animate-pulse" />
        {firstName(person.name)} &middot; on shift
      </span>

      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-ink-muted">
          {isOver ? "Over by" : "Time left"}
        </div>
        <div
          suppressHydrationWarning
          className={`text-2xl font-extrabold leading-[1.3] tabular-nums ${isOver ? overColor : "text-brand-ink"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatDuration(Math.abs(minutesToEnd))}
        </div>
        <div className="text-[11px] text-ink-muted">
          signed in {clock12(shift.startedAt)}
          {shift.lateMinutes ? `, ${shift.lateMinutes} min late` : ""}
        </div>
      </div>

      <GeoLine distanceM={shift.distanceM} radiusM={radiusM} />

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          // Finishing before the rostered end (beyond the grace period)
          // asks for a reason first; the server enforces the same rule.
          if (minutesToEnd > lateAfterMinutes) setEndEarlyOpen(true);
          else run(() => endShift());
        }}
        className="h-[38px] rounded-[var(--radius)] border-[1.5px] border-danger text-[12.5px] font-extrabold text-danger disabled:opacity-50"
      >
        End shift
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setExtendOpen(true)}
        className="text-left text-[12px] font-bold text-brand-ink disabled:opacity-50"
      >
        {shift.extendedMinutes ? `Extended by ${shift.extendedMinutes} min, change` : "Need to extend the shift time?"}
      </button>

      {endEarlyOpen && (
        <EndEarlyDialog
          minutesEarly={Math.round(minutesToEnd)}
          onClose={() => setEndEarlyOpen(false)}
          onEnded={() => {
            setEndEarlyOpen(false);
            onEnded();
          }}
        />
      )}
      {extendOpen && (
        <ExtendShiftDialog
          onClose={() => setExtendOpen(false)}
          onSaved={() => {
            setExtendOpen(false);
            onEnded();
          }}
        />
      )}
    </div>
  );
}

/** The mockup's sign-in confirmation ("signed in, on site 40m from..."),
 *  kept on the shift card so it's there for the whole shift rather than
 *  vanishing the moment the checklist loads. */
function GeoLine({ distanceM, radiusM }: { distanceM: number | null; radiusM: number }) {
  if (distanceM == null) {
    return <p className="m-0 text-[10.5px] text-ink-muted">Location wasn&rsquo;t shared when you signed in.</p>;
  }
  const near = distanceM <= radiusM;
  const away = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`;
  return (
    <p className={`m-0 flex items-start gap-1 text-[10.5px] font-semibold ${near ? "text-ok" : "text-warm-ink"}`}>
      <svg className="mt-px shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {near ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />}
      </svg>
      <span>{near ? `On site, ${away} from the shelter` : `Signed in ${away} from the shelter, flagged in the shift email`}</span>
    </p>
  );
}

function HandoverBanner({ note }: { note: { personName: string; body: string; part: Part; date: string } }) {
  const day = parseYmd(note.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-[#F0D69A] bg-warm-tint px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-warm-ink">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.05em]">Handover</span>
      </div>
      <p className="m-0 line-clamp-4 text-xs leading-[1.45] text-foreground">&quot;{note.body}&quot;</p>
      <p className="m-0 text-[10.5px] font-semibold text-ink-muted">
        {firstName(note.personName)} &middot; {note.part === "morning" ? "AM" : "PM"} shift, {day}
      </p>
      <Link href="/shift/handover" className="w-fit text-[13px] font-bold text-brand-ink">
        View all &rarr;
      </Link>
    </div>
  );
}

const PART_ORDER: Part[] = ["morning", "afternoon"];

/** The mockup's "Today's roster": who's on, session by session, with
 *  "unstaffed" spelled out rather than left as a gap. */
function TodayRoster({ sessions }: { sessions: RosterDaySession[] }) {
  const byPart = new Map(sessions.map((s) => [s.part, s]));
  return (
    <div>
      <h2 className="m-0 mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-ink-muted">
        Today&rsquo;s roster
      </h2>
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
