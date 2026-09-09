"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWalk, bringDogIn } from "@/lib/actions/dog-activity";
import { StartWalkDialog } from "@/components/dogs/start-walk-dialog";

// The one-tap fast paths from docs/ui-flows.md §4/§5. Bring-in doesn't need
// to know who's operating it (it just closes whatever's open), but Start
// Walk does: staff get a person-picker (the kiosk case — see
// StartWalkDialog) instead of assuming themselves, which stays the instant
// tap for the rare self-serve volunteer.
//
// Tried a "Correct time?" confirm after End X (2026-09-06/07) so a wrong
// return time could be fixed on the spot — dropped it per Paul (2026-09-08):
// it adds a required tap to the common case where the time IS right, and
// the existing "Edit times" link on the dog's Activity summary is only two
// taps away (dog -> Edit times) for the rare time it's wrong. Fewest clicks
// for the standard case wins; the correction path already exists elsewhere.
export function DogActionButton({
  dogId,
  mode,
  label,
  canKiosk,
  currentPersonId,
  currentPersonName,
}: {
  dogId: string;
  mode: "walk" | "bring_in";
  label: string;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "walk" && canKiosk) {
      setPickerOpen(true);
      return;
    }
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
          mode === "walk" ? "bg-ok" : "bg-danger"
        }`}
      >
        {isPending ? "…" : label}
      </button>
      {error && <p className="text-xs text-danger max-w-40 text-right">{error}</p>}

      {mode === "walk" && canKiosk && (
        <StartWalkDialog
          dogId={dogId}
          currentPersonId={currentPersonId}
          currentPersonName={currentPersonName}
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
