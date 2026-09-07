"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWalk, bringDogIn } from "@/lib/actions/dog-activity";
import { EditActivityDialog } from "@/components/dogs/edit-activity-dialog";
import { StartWalkDialog } from "@/components/dogs/start-walk-dialog";

type ClosedRecord = { id: string; startedAt: string; endedAt: string };

// The fast paths from docs/ui-flows.md §4/§5. Bring-in doesn't need to know
// who's operating it (it just closes whatever's open), but Start Walk does:
// staff get a person-picker (the kiosk case, the real common one — see
// StartWalkDialog) instead of the instant "it's me" tap, which stays as-is
// for the rare self-serve volunteer.
export function DogActionButton({
  dogId,
  mode,
  label,
  isStaff,
  currentPersonId,
  currentPersonName,
}: {
  dogId: string;
  mode: "walk" | "bring_in";
  label: string;
  isStaff: boolean;
  currentPersonId: string;
  currentPersonName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // After "End X", the real return time is very often not "now" — offer an
  // immediate confirm right here rather than making it a scavenger hunt
  // through the activity log (Paul's real case, 2026-09-06: brought Lassie
  // in from the yard earlier, only got to the app later; End Yard booked
  // her out at click-time). This is a real <dialog>, not an inline swap at
  // the same spot the End button was — an inline swap let a phantom second
  // tap (touch devices can fire touch + a synthetic click for one tap) land
  // right on "Yes" before Paul could ever read it (2026-09-07: "only got a
  // flash"). A modal can't be tapped-through like that.
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [closed, setClosed] = useState<ClosedRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (closed) confirmDialogRef.current?.showModal();
    else confirmDialogRef.current?.close();
  }, [closed]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "walk" && isStaff) {
      setPickerOpen(true);
      return;
    }
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

      {mode === "walk" && isStaff && (
        <StartWalkDialog
          dogId={dogId}
          currentPersonId={currentPersonId}
          currentPersonName={currentPersonName}
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {closed && (
        <dialog
          ref={confirmDialogRef}
          onClose={dismiss}
          className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-xs"
          onClick={(e) => e.target === e.currentTarget && dismiss()}
        >
          <div className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold">Correct time?</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={dismiss} className="h-10 px-4 rounded-[var(--radius)] bg-ok text-white font-bold">
                Yes
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="h-10 px-4 rounded-[var(--radius)] bg-danger text-white font-bold"
              >
                No
              </button>
            </div>
          </div>
        </dialog>
      )}
      {closed && (
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
      )}
    </div>
  );
}
