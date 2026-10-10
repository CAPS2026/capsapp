"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DogListItem, OrgSettings, StatusMeta } from "@/lib/dogs";
import { STATUS_COLOR_VAR, endActionLabel, type DogStatus } from "@/lib/dogs";
import {
  daysAgoLabel,
  formatDaysHoursOut,
  formatHoursMinutes,
  formatMinutesOut,
  formatStartedLine,
  minutesSince,
  timerColor,
} from "@/lib/format";
import { DogActionButton } from "@/components/dogs/dog-action-button";
import { ActionMenu } from "@/components/dogs/action-menu";

type FilterKey = DogStatus | "out_now";

export function DogsList({
  dogs,
  statusMeta,
  orgSettings,
  currentPersonId,
  currentPersonName,
  isStaff,
  canKiosk,
}: {
  dogs: DogListItem[];
  statusMeta: StatusMeta[];
  orgSettings: OrgSettings;
  currentPersonId: string;
  currentPersonName: string;
  isStaff: boolean;
  canKiosk: boolean;
}) {
  // Single-select — picking a filter replaces whichever was active, per
  // Paul's feedback (2026-09-06) that these shouldn't stack.
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [, setTick] = useState(0);

  // Re-render every 30s so live timers keep counting up without a full refetch.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  function toggleFilter(key: FilterKey) {
    setActiveFilter((prev) => (prev === key ? null : key));
  }

  const statusByCode = useMemo(() => new Map(statusMeta.map((s) => [s.code, s])), [statusMeta]);

  const filteredDogs = useMemo(() => {
    return dogs.filter((dog) => {
      if (activeFilter === "out_now") return !!statusByCode.get(dog.status)?.isOut;
      if (activeFilter) return dog.status === activeFilter;
      return true;
    });
  }, [dogs, activeFilter, statusByCode]);

  // One button per status, Available first, each with how many dogs are in it right now.
  const chipOrder: DogStatus[] = ["available", "walking", "yard", "bed_rest", "jail_break", "fostered"];
  const chips = useMemo(() => {
    const known = new Map(statusMeta.map((st) => [st.code, st]));
    const codes = [...chipOrder.filter((c) => known.has(c)), ...statusMeta.map((st) => st.code).filter((c) => !chipOrder.includes(c))];
    return codes.map((code) => ({
      code,
      label: known.get(code)?.label ?? code,
      count: dogs.filter((d) => d.status === code).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogs, statusMeta]);

  const groups = useMemo(() => {
    return statusMeta.map((status) => {
      const inGroup = filteredDogs
        .filter((d) => d.status === status.code)
        .sort((a, b) => {
          if (!a.lastWalkAt && !b.lastWalkAt) return 0;
          if (!a.lastWalkAt) return -1;
          if (!b.lastWalkAt) return 1;
          return new Date(a.lastWalkAt).getTime() - new Date(b.lastWalkAt).getTime();
        });
      return { status, dogs: inGroup };
    });
  }, [filteredDogs, statusMeta]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-6">
      <div className="flex gap-2 flex-wrap">
        <FilterChip label="All" active={activeFilter === null} onClick={() => setActiveFilter(null)} />
        {chips.map((c) => (
          <FilterChip
            key={c.code}
            label={`${c.label} (${c.count})`}
            dot={`var(${STATUS_COLOR_VAR[c.code]})`}
            muted={c.count === 0}
            active={activeFilter === c.code}
            onClick={() => toggleFilter(c.code)}
          />
        ))}
        <FilterChip label="Out now" active={activeFilter === "out_now"} onClick={() => toggleFilter("out_now")} />
      </div>

      {groups.map(({ status, dogs: groupDogs }) =>
        groupDogs.length === 0 ? null : (
          <section key={status.code} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: `var(${STATUS_COLOR_VAR[status.code]})` }}
              />
              {status.label}
              <span className="text-ink-muted font-normal">({groupDogs.length})</span>
            </h2>
            <div className="flex flex-col gap-2">
              {groupDogs.map((dog) => (
                <DogCard
                  key={dog.id}
                  dog={dog}
                  orgSettings={orgSettings}
                  canBringIn={canKiosk || dog.current?.personId === currentPersonId}
                  isStaff={isStaff}
                  canKiosk={canKiosk}
                  currentPersonId={currentPersonId}
                  currentPersonName={currentPersonName}
                />
              ))}
            </div>
          </section>
        ),
      )}

      {filteredDogs.length === 0 && (
        <p className="text-ink-muted text-sm text-center py-8">No dogs match this filter.</p>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  dot,
  muted,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
        active ? "bg-brand text-white border-brand" : `bg-card border-line ${muted ? "text-ink-muted/60" : "text-ink-muted"}`
      }`}
    >
      {dot && <span className="inline-block w-2 h-2 rounded-full" style={{ background: dot }} />}
      {label}
    </button>
  );
}

function DogCard({
  dog,
  orgSettings,
  canBringIn,
  isStaff,
  canKiosk,
  currentPersonId,
  currentPersonName,
}: {
  dog: DogListItem;
  orgSettings: OrgSettings;
  canBringIn: boolean;
  isStaff: boolean;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
}) {
  const isAvailable = dog.status === "available";

  return (
    <div className="flex items-center gap-2 bg-card border border-line rounded-[var(--radius)] p-2">
      <Link href={`/dogs/${dog.id}`} className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar photoUrl={dog.photoUrl} name={dog.name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm truncate">{dog.name}</span>
            <span className="text-xs text-ink-muted shrink-0">{dog.ref}</span>
            {dog.experiencedHandlerOnly && (
              <span className="shrink-0" title="Experienced handlers only" aria-label="Experienced handlers only">
                ⚠️
              </span>
            )}
          </div>
          <CardLine dog={dog} orgSettings={orgSettings} />
        </div>
      </Link>

      {/* Only ONE primary action visible per card, plus the "⋯" menu for
          everything else relevant to an Available dog — keeps the card
          narrow enough for a phone (Paul's feedback, 2026-09-06). */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isAvailable && (
          <DogActionButton
            dogId={dog.id}
            mode="walk"
            label="Start Walk"
            canKiosk={canKiosk}
            currentPersonId={currentPersonId}
            currentPersonName={currentPersonName}
          />
        )}
        {isAvailable && (
          <ActionMenu
            dogId={dog.id}
            isStaff={isStaff}
            canKiosk={canKiosk}
            currentPersonId={currentPersonId}
            currentPersonName={currentPersonName}
          />
        )}
        {/* Whether the End button shows is about "is there an open activity
            to close", not the dog_statuses.is_out flag — bed_rest is
            deliberately is_out=false (on-site, not away) but still needs
            closing (bug fixed 2026-09-06: this used to check isOut and
            silently hid End Bed Rest). */}
        {dog.current && canBringIn && (
          <DogActionButton
            dogId={dog.id}
            mode="bring_in"
            label={endActionLabel(dog.status)}
            overdue={!!dog.current.dueBack && new Date(dog.current.dueBack) < new Date()}
            canKiosk={canKiosk}
            currentPersonId={currentPersonId}
            currentPersonName={currentPersonName}
          />
        )}
      </div>
    </div>
  );
}

function Avatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, count is small
    return <img src={photoUrl} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-tint flex items-center justify-center text-ink-muted font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** ⏰ flag once a due-back time has passed and the dog is still out. */
function OverdueFlag({ dueBack }: { dueBack: string }) {
  if (new Date(dueBack) >= new Date()) return null;
  return (
    <span className="text-danger font-semibold" title="Overdue">
      {" "}
      ⏰ Overdue
    </span>
  );
}

function CardLine({ dog, orgSettings }: { dog: DogListItem; orgSettings: OrgSettings }) {
  const c = dog.current;

  switch (dog.status) {
    case "walking": {
      if (!c) return null;
      const minutes = minutesSince(c.startedAt);
      // Two short lines, laid out like the Foster / Jail Break card: who and how long on the first,
      // when it started on the second.
      return (
        <div className="text-xs" style={{ color: timerColor(minutes, orgSettings.walkAlertAfterMinutes) }}>
          <p>
            With: {c.personName ?? "someone"} · Time out: {formatMinutesOut(c.startedAt)}
          </p>
          <p>{formatStartedLine("Started", c.startedAt)}</p>
        </div>
      );
    }
    case "yard": {
      if (!c) return null;
      const minutes = minutesSince(c.startedAt);
      return (
        <p className="text-xs" style={{ color: timerColor(minutes, orgSettings.yardAlertAfterMinutes) }}>
          {c.reason ?? "Yard"} · {formatStartedLine("Started", c.startedAt)} · Time in Yard{" "}
          {formatMinutesOut(c.startedAt)}
          {c.dueBack && <> · {formatStartedLine("Due End", c.dueBack)}</>}
          {c.dueBack && <OverdueFlag dueBack={c.dueBack} />}
        </p>
      );
    }
    case "available":
      return (
        <p className="text-xs truncate text-ink">
          {dog.lastWalkAt
            ? `Last walk: ${daysAgoLabel(dog.lastWalkAt)}, 4wk time: ${formatHoursMinutes(dog.fourWeekWalkMinutes)}`
            : "Never walked"}
        </p>
      );
    case "bed_rest":
      if (!c) return null;
      return (
        <p className="text-xs text-ink">
          {formatStartedLine("Start", c.startedAt)}
          {c.dueBack && <> · {formatStartedLine("Due End", c.dueBack)}</>}
          {c.dueBack && <OverdueFlag dueBack={c.dueBack} />}
          {c.reason ? ` · ${c.reason}` : ""} · Time out: {formatDaysHoursOut(c.startedAt)}
        </p>
      );
    case "jail_break":
    case "fostered":
      if (!c) return null;
      return (
        <div className="text-xs text-ink">
          <p>
            With: {c.personName ?? "someone"} · Time out: {formatDaysHoursOut(c.startedAt)}
          </p>
          <p>
            {formatStartedLine("Start", c.startedAt)}
            {c.dueBack && <> · {formatStartedLine("Due End", c.dueBack)}</>}
            {c.dueBack && <OverdueFlag dueBack={c.dueBack} />}
          </p>
        </div>
      );
    default:
      return null;
  }
}
