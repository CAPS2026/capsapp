"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OpenVisit } from "@/lib/site-visits-data";
import { signOutOfSite } from "@/lib/actions/site-visits";
import { formatElapsed } from "@/lib/format";

export function SiteVisitBoard({ visits }: { visits: OpenVisit[] }) {
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
      <div>
        <p className="font-bold">{visit.displayName}</p>
        <p className="text-sm text-ink-muted">
          {visit.reasonLabel} · since {formatElapsed(visit.checkedIn)}
        </p>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={isPending}
        className="h-9 px-4 rounded-full bg-ok text-white text-sm font-bold disabled:opacity-60"
      >
        {isPending ? "…" : "Sign out"}
      </button>
    </div>
  );
}
