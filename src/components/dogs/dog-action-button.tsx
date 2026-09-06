"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWalk, bringDogIn } from "@/lib/actions/dog-activity";

// The one-tap fast paths from docs/ui-flows.md §4/§5. The fuller wizard
// (different walker, other activity types, backdated entries) is a later
// slice — this only ever inserts "walk, me, now" or closes whatever's open.
export function DogActionButton({ dogId, mode }: { dogId: string; mode: "walk" | "bring_in" }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = mode === "walk" ? await startWalk(dogId) : await bringDogIn(dogId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`h-9 px-4 rounded-full text-sm font-bold text-white disabled:opacity-60 ${
          mode === "walk" ? "bg-brand" : "bg-ok"
        }`}
      >
        {isPending ? "…" : mode === "walk" ? "Walk" : "Bring in"}
      </button>
      {error && <p className="text-xs text-danger max-w-40 text-right">{error}</p>}
    </div>
  );
}
