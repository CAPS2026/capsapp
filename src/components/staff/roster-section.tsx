"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PART_LABEL, type Part, type RosterPerson, type RosterSession } from "@/lib/staff";
import {
  assignToSession,
  unassignFromSession,
  setSessionTimes,
  copyLastWeek,
} from "@/lib/actions/staff";

export function RosterSection({
  date,
  sessions,
  rosterable,
  isAdmin,
}: {
  date: string;
  sessions: RosterSession[];
  rosterable: RosterPerson[];
  isAdmin: boolean;
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
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Roster</h2>
        {isAdmin && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => copyLastWeek(date))}
            className="text-sm font-semibold text-brand-ink disabled:opacity-50"
          >
            Copy last week
          </button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <SessionCard
            key={s.part}
            date={date}
            session={s}
            rosterable={rosterable}
            isAdmin={isAdmin}
            busy={isPending}
            run={run}
          />
        ))}
      </div>
    </section>
  );
}

function SessionCard({
  date,
  session,
  rosterable,
  isAdmin,
  busy,
  run,
}: {
  date: string;
  session: RosterSession;
  rosterable: RosterPerson[];
  isAdmin: boolean;
  busy: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  const [editTimes, setEditTimes] = useState(false);
  const [starts, setStarts] = useState(session.starts);
  const [ends, setEnds] = useState(session.ends);
  const part: Part = session.part;

  const assignedIds = new Set(session.people.map((p) => p.id));
  const available = rosterable.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="bg-card border border-line rounded-[var(--radius)] p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{PART_LABEL[part]}</span>
        {editTimes ? (
          <div className="flex items-center gap-1 text-sm">
            <input
              type="time"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              className="h-9 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
            />
            <span className="text-ink-muted">–</span>
            <input
              type="time"
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
              className="h-9 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await setSessionTimes(date, part, starts, ends);
                  if (!r.error) setEditTimes(false);
                  return r;
                })
              }
              className="h-9 px-3 rounded-[var(--radius)] bg-ok text-white font-bold text-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>
        ) : (
          <span className="text-sm text-ink-muted">
            {session.starts}–{session.ends}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setStarts(session.starts);
                  setEnds(session.ends);
                  setEditTimes(true);
                }}
                className="ml-2 text-brand-ink font-semibold"
              >
                Edit
              </button>
            )}
          </span>
        )}
      </div>

      {session.people.length === 0 && !isAdmin && (
        <p className="text-sm text-ink-muted">Nobody rostered.</p>
      )}

      <ul className="flex flex-col gap-1">
        {session.people.map((p, i) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              <span className="text-ink-muted mr-2">{i + 1}.</span>
              {p.name}
            </span>
            {isAdmin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => unassignFromSession(date, part, p.id))}
                aria-label={`Remove ${p.name}`}
                className="text-danger font-bold px-2 disabled:opacity-50"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            disabled={busy || available.length === 0}
            onChange={(e) => {
              const id = e.target.value;
              e.target.value = "";
              if (id) run(() => assignToSession(date, part, id));
            }}
            className="h-9 px-2 rounded-[var(--radius)] border border-line-cool bg-white text-sm flex-1 min-w-0"
          >
            <option value="">
              {available.length === 0 ? "Everyone's on this session" : "Add someone…"}
            </option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {session.people.length >= 3 && (
            <span className="text-xs text-ink-muted shrink-0">{session.people.length} on shift</span>
          )}
        </div>
      )}
    </div>
  );
}
