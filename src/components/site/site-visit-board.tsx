"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OpenVisit } from "@/lib/site-visits-data";
import { signOutOfSite } from "@/lib/actions/site-visits";
import { formatElapsed, formatTime24 } from "@/lib/format";

export function SiteVisitBoard({ visits }: { visits: OpenVisit[] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (visits.length === 0) {
    return <p className="text-sm text-ink-muted">Nobody signed in right now.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {visits.map((v) => (
        <VisitRow key={v.id} visit={v} />
      ))}
    </div>
  );
}

function VisitRow({ visit }: { visit: OpenVisit }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function signOut() {
    startTransition(async () => {
      await signOutOfSite(visit.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-card border border-line rounded-[var(--radius)] p-3">
      <div className="min-w-0">
        <p className="font-bold truncate">{visit.displayName}</p>
        <p className="text-sm text-ink-muted">
          {visit.reasonLabel} · in {formatTime24(visit.checkedIn)} · {formatElapsed(visit.checkedIn)}
        </p>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={isPending}
        className="h-9 px-4 rounded-full bg-danger text-white text-sm font-bold disabled:opacity-60 shrink-0"
      >
        {isPending ? "…" : "Sign out"}
      </button>
    </div>
  );
}
