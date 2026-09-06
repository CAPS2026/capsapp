"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DogListItem, OrgSettings, StatusMeta } from "@/lib/dogs";
import { STATUS_COLOR_VAR, endActionLabel } from "@/lib/dogs";
import { daysAgoLabel, daysSince, formatDate, formatElapsed, minutesSince, timerColor } from "@/lib/format";
import { DogActionButton } from "@/components/dogs/dog-action-button";
import { ManualWalkDialog } from "@/components/dogs/manual-walk-dialog";
import { BringInAtDialog } from "@/components/dogs/bring-in-at-dialog";
import { StartPlacementDialog } from "@/components/dogs/start-placement-dialog";

type FilterKey = "needs_walk" | "out_now" | "mine";

export function DogsList({
  dogs,
  statusMeta,
  orgSettings,
  currentPersonId,
  isStaff,
}: {
  dogs: DogListItem[];
  statusMeta: StatusMeta[];
  orgSettings: OrgSettings;
  currentPersonId: string;
  isStaff: boolean;
}) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [, setTick] = useState(0);

  // Re-render every 30s so live timers keep counting up without a full refetch.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const statusByCode = useMemo(() => new Map(statusMeta.map((s) => [s.code, s])), [statusMeta]);

  const filteredDogs = useMemo(() => {
    return dogs.filter((dog) => {
      if (activeFilters.has("needs_walk")) {
        const isAvailable = dog.status === "available";
        const overdue = !dog.lastWalkAt || daysSince(dog.lastWalkAt) > orgSettings.needsWalkAfterDays;
        if (!isAvailable || !overdue) return false;
      }
      if (activeFilters.has("out_now") && !statusByCode.get(dog.status)?.isOut) return false;
      if (activeFilters.has("mine") && dog.current?.personId !== currentPersonId) return false;
      return true;
    });
  }, [dogs, activeFilters, orgSettings.needsWalkAfterDays, statusByCode, currentPersonId]);

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
        <FilterChip label="Needs a walk" active={activeFilters.has("needs_walk")} onClick={() => toggleFilter("needs_walk")} />
        <FilterChip label="Out now" active={activeFilters.has("out_now")} onClick={() => toggleFilter("out_now")} />
        <FilterChip label="My dogs" active={activeFilters.has("mine")} onClick={() => toggleFilter("mine")} />
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
                  isOut={status.isOut}
                  canBringIn={isStaff || dog.current?.personId === currentPersonId}
                  isStaff={isStaff}
                  currentPersonId={currentPersonId}
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

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-full text-sm font-semibold border transition-colors ${
        active ? "bg-brand text-white border-brand" : "bg-card text-ink-muted border-line"
      }`}
    >
      {label}
    </button>
  );
}

function DogCard({
  dog,
  orgSettings,
  isOut,
  canBringIn,
  isStaff,
  currentPersonId,
}: {
  dog: DogListItem;
  orgSettings: OrgSettings;
  isOut: boolean;
  canBringIn: boolean;
  isStaff: boolean;
  currentPersonId: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card border border-line rounded-[var(--radius)] p-3">
      <Link href={`/dogs/${dog.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar photoUrl={dog.photoUrl} name={dog.name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold truncate">{dog.name}</span>
            <span className="text-xs text-ink-muted">{dog.ref}</span>
            {dog.experiencedHandlerOnly && (
              <span title="Experienced handlers only" aria-label="Experienced handlers only">
                ⚠️
              </span>
            )}
          </div>
          <CardLine dog={dog} orgSettings={orgSettings} />
        </div>
      </Link>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {dog.status === "available" && <DogActionButton dogId={dog.id} mode="walk" label="Start Walk" />}
        {dog.status === "available" && isStaff && <StartPlacementDialog dogId={dog.id} />}
        {isOut && canBringIn && (
          <>
            <DogActionButton dogId={dog.id} mode="bring_in" label={endActionLabel(dog.status)} />
            <BringInAtDialog dogId={dog.id} />
          </>
        )}
        <ManualWalkDialog dogId={dog.id} isStaff={isStaff} currentPersonId={currentPersonId} />
      </div>
    </div>
  );
}

function Avatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, count is small
    return <img src={photoUrl} alt={name} className="w-12 h-12 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-12 h-12 rounded-full bg-gray-tint flex items-center justify-center text-ink-muted font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function CardLine({ dog, orgSettings }: { dog: DogListItem; orgSettings: OrgSettings }) {
  const c = dog.current;

  switch (dog.status) {
    case "walking": {
      if (!c) return null;
      const minutes = minutesSince(c.startedAt);
      return (
        <p className="text-sm" style={{ color: timerColor(minutes, orgSettings.walkAlertAfterMinutes) }}>
          With {c.personName ?? "someone"} · out {formatElapsed(c.startedAt)}
        </p>
      );
    }
    case "yard": {
      if (!c) return null;
      const minutes = minutesSince(c.startedAt);
      return (
        <p className="text-sm" style={{ color: timerColor(minutes, orgSettings.yardAlertAfterMinutes) }}>
          In the yard · {formatElapsed(c.startedAt)}
        </p>
      );
    }
    case "available":
      return (
        <p className="text-sm text-ink-muted">
          {dog.lastWalkAt ? `Last walk ${daysAgoLabel(dog.lastWalkAt)}` : "Never walked"}
        </p>
      );
    case "bed_rest":
      if (!c) return null;
      return (
        <p className="text-sm text-ink-muted">
          Since {formatDate(c.startedAt)}
          {c.dueBack ? ` · due ${formatDate(c.dueBack)}` : ""}
          {c.reason ? ` · ${c.reason}` : ""}
        </p>
      );
    case "jail_break":
    case "fostered":
      if (!c) return null;
      return (
        <p className="text-sm text-ink-muted">
          With {c.personName ?? "someone"} · out {daysSince(c.startedAt)}d
          {c.dueBack ? ` · due ${formatDate(c.dueBack)}` : ""}
        </p>
      );
    default:
      return null;
  }
}
