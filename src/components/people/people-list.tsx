"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PersonListItem } from "@/lib/people-data";
import { ROLE_BADGE_CLASS, ROLE_LABEL } from "@/lib/people";
import { daysAgoLabel, formatHoursMinutes } from "@/lib/format";

type Filter = "pending" | "volunteer" | "volunteer_plus" | "jail_break" | "foster" | "committee" | "staff";

// Tap more than one to see people who match ANY of them (Paul, 2026-10-04).
// Nothing selected = everyone.
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "volunteer", label: "Volunteers" },
  { key: "volunteer_plus", label: "Volunteer +" },
  { key: "jail_break", label: "Jail break" },
  { key: "foster", label: "Foster" },
  { key: "committee", label: "Committee" },
  { key: "staff", label: "Staff" },
];

function matchesFilter(p: PersonListItem, f: Filter): boolean {
  if (f === "pending") return p.hasPending;
  const active = p.roles.filter((r) => r.status === "active").map((r) => r.role);
  switch (f) {
    case "volunteer":
      return active.includes("volunteer");
    case "volunteer_plus":
      return active.includes("volunteer_plus");
    case "jail_break":
      return active.includes("jailbreak_carer");
    case "foster":
      return active.includes("foster_carer");
    case "committee":
      return active.includes("committee");
    case "staff":
      return active.includes("staff") || active.includes("admin");
  }
}

export function PeopleList({ people }: { people: PersonListItem[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Filter[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const { visible, archivedCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    let archivedCount = 0;
    const visible = people.filter((p) => {
      if (p.archived) {
        archivedCount += 1;
        if (!showArchived) return false;
      }
      if (q && !p.name.toLowerCase().includes(q) && !(p.nickname ?? "").toLowerCase().includes(q))
        return false;
      return selected.length === 0 || selected.some((f) => matchesFilter(p, f));
    });
    // Pending first, then by name (the list already comes name-sorted).
    visible.sort((a, b) => Number(b.hasPending) - Number(a.hasPending));
    return { visible, archivedCount };
  }, [people, query, selected, showArchived]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base"
      />

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setSelected((cur) => (cur.includes(f.key) ? cur.filter((k) => k !== f.key) : [...cur, f.key]))}
            className={`shrink-0 px-3 h-8 rounded-full text-sm font-semibold border ${
              selected.includes(f.key) ? "bg-brand text-white border-brand" : "border-line-cool text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="text-sm text-ink-muted py-4">No one matches.</p>}

      <ul className="flex flex-col divide-y divide-line border border-line rounded-[var(--radius)]">
        {visible.map((p) => (
          <li key={p.id}>
            <Link href={`/people/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-tint">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                <img src={p.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-tint flex items-center justify-center text-xs font-bold text-ink-muted shrink-0">
                  {p.name.split(" ").map((s) => s.charAt(0)).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">
                    {p.nickname ? (
                      <>
                        {p.nickname} <span className="text-ink font-normal">({p.name})</span>
                      </>
                    ) : (
                      p.name
                    )}
                  </span>
                  {p.isMinor && <span className="text-xs font-bold text-warm-ink">U18</span>}
                  {p.hasAccount && <span className="text-xs text-ink-muted" title="Has an app account">◧</span>}
                </div>
                <div className="flex gap-1 flex-wrap mt-1">
                  {p.roles
                    .filter((r) => r.status === "active" || r.status === "pending")
                    .map((r) => (
                      <span
                        key={r.id}
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE_CLASS[r.role]} ${
                          r.status === "pending" ? "opacity-60" : ""
                        }`}
                      >
                        {ROLE_LABEL[r.role]}
                        {r.status === "pending" ? " • pending" : ""}
                      </span>
                    ))}
                  {p.archived && <span className="text-xs text-ink-muted">archived</span>}
                </div>
                {p.roles.some((r) => r.role === "volunteer" && r.status === "active") && (
                  <p className="text-xs text-ink mt-1">
                    {p.lastWalkAt
                      ? `Last walk: ${daysAgoLabel(p.lastWalkAt)}, 4wk time: ${formatHoursMinutes(p.fourWeekWalkMinutes)}`
                      : "No walks yet"}
                  </p>
                )}
              </div>
              {(p.missingEmergencyContact || p.noImageConsent) && (
                <div className="flex flex-col items-end gap-0.5 shrink-0 text-xs font-semibold text-danger">
                  {p.missingEmergencyContact && <span title="No emergency contact">no EC</span>}
                  {p.noImageConsent && (
                    <span title="Said no to promotional-image use">no photos</span>
                  )}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="text-sm text-brand-ink font-semibold self-start"
        >
          {showArchived ? "Hide" : "Show"} archived ({archivedCount})
        </button>
      )}
    </div>
  );
}
