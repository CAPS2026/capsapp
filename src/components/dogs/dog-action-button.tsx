"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWalk, bringDogIn } from "@/lib/actions/dog-activity";
import { EditActivityDialog } from "@/components/dogs/edit-activity-dialog";

type ClosedRecord = { id: string; startedAt: string; endedAt: string };

// The one-tap fast paths from docs/ui-flows.md §4/§5. The fuller wizard
// (different walker, other activity types, backdated entries) is a later
// slice — this only ever inserts "walk, me, now" or closes whatever's open.
export function DogActionButton({
  dogId,
  mode,
  label,
}: {
  dogId: string;
  mode: "walk" | "bring_in";
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // After "End X", the real return time is very often not "now" — offer an
  // immediate edit right here rather than making it a scavenger hunt
  // through the activity log (Paul's real case, 2026-09-06: brought Lassie
  // in from the yard earlier, only got to the app later; End Yard booked
  // her out at click-time). Deliberately does NOT refresh the list until
  // dismissed, so the card doesn't jump to a new status group mid-edit.
  const [closed, setClosed] = useState<ClosedRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      if (mode === "walk") {
        const result = await startWalk(dogId);
        if (result.error) setError(result.error);
        else router.refresh();
        return;
      }
      const result = await bringDogIn(dogId);
      if (result.closed) setClosed(result.closed);
      else setError(result.error);
    });
  }

  function dismiss() {
    setClosed(null);
    router.refresh();
  }

  if (closed) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold">Correct time?</p>
        <div className="flex gap-2">
          <button type="button" onClick={dismiss} className="text-xs font-bold text-ok">
            Yes
          </button>
          <button type="button" onClick={() => setEditOpen(true)} className="text-xs font-bold text-danger">
            No
          </button>
        </div>
        <EditActivityDialog
          dogId={dogId}
          activityId={closed.id}
          startedAt={closed.startedAt}
          endedAt={closed.endedAt}
          isOpen={editOpen}
          onClose={() => {
            setEditOpen(false);
            dismiss();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`h-9 px-4 rounded-full text-sm font-bold text-white disabled:opacity-60 ${
          mode === "walk" ? "bg-ok" : "bg-danger"
        }`}
      >
        {isPending ? "…" : label}
      </button>
      {error && <p className="text-xs text-danger max-w-40 text-right">{error}</p>}
    </div>
  );
}
