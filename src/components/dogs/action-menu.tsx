"use client";

import { useRef, useState } from "react";
import { StartPlacementDialog, type PlacementType } from "@/components/dogs/start-placement-dialog";
import { ManualWalkDialog } from "@/components/dogs/manual-walk-dialog";

type MenuAction = PlacementType | "manual";

const ROWS: { action: PlacementType; label: string }[] = [
  { action: "yard", label: "Start Yard" },
  { action: "bed_rest", label: "Start Bed Rest" },
  { action: "jail_break", label: "Start Jail Break" },
  { action: "foster", label: "Start Foster" },
];

// One "⋯" icon button (a real 44px tap target) replacing the previous
// small text links, opening a bottom-sheet of every action relevant to an
// Available dog — Paul's feedback (2026-09-06): the old app had a
// dedicated button per action; a single hidden "Other…" link wasn't
// discoverable enough, but stacking that many buttons on the card doesn't
// fit a phone either. This is on Available dogs only — while something's
// already open, the single End button on the card is the only action.
export function ActionMenu({
  dogId,
  isStaff,
  currentPersonId,
}: {
  dogId: string;
  isStaff: boolean;
  currentPersonId: string;
}) {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<MenuAction | null>(null);

  function openSheet() {
    sheetRef.current?.showModal();
  }

  function pick(action: MenuAction) {
    sheetRef.current?.close();
    setActive(action);
  }

  if (!isStaff) {
    // Volunteers only ever get Manual entry here — no menu needed for one item.
    return (
      <ManualWalkDialogTrigger dogId={dogId} isStaff={false} currentPersonId={currentPersonId} />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openSheet();
        }}
        aria-label="More actions"
        className="w-11 h-11 rounded-full border border-line text-ink-muted text-xl leading-none flex items-center justify-center shrink-0"
      >
        ⋯
      </button>

      <dialog
        ref={sheetRef}
        className="m-0 mt-auto mb-0 mx-0 w-full max-w-full rounded-t-2xl rounded-b-none border-0 p-0 backdrop:bg-black/40 sm:m-auto sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.target === e.currentTarget && sheetRef.current?.close()}
      >
        <div className="flex flex-col p-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted px-3 pt-2 pb-1">Take out</p>
          {ROWS.map((row) => (
            <button
              key={row.action}
              type="button"
              onClick={() => pick(row.action)}
              className="text-left h-12 px-3 rounded-[var(--radius)] font-semibold hover:bg-gray-tint"
            >
              {row.label}
            </button>
          ))}
          <div className="h-px bg-line my-1" />
          <button
            type="button"
            onClick={() => pick("manual")}
            className="text-left h-12 px-3 rounded-[var(--radius)] font-semibold hover:bg-gray-tint"
          >
            Manual entry
          </button>
          <button
            type="button"
            onClick={() => sheetRef.current?.close()}
            className="text-left h-12 px-3 rounded-[var(--radius)] text-ink-muted"
          >
            Cancel
          </button>
        </div>
      </dialog>

      {ROWS.map((row) => (
        <StartPlacementDialog
          key={row.action}
          dogId={dogId}
          type={row.action}
          isOpen={active === row.action}
          onClose={() => setActive(null)}
        />
      ))}
      <ManualWalkDialog
        dogId={dogId}
        isStaff={isStaff}
        currentPersonId={currentPersonId}
        isOpen={active === "manual"}
        onClose={() => setActive(null)}
      />
    </>
  );
}

/** Volunteer-only case: a plain small trigger, no bottom sheet. */
function ManualWalkDialogTrigger({
  dogId,
  isStaff,
  currentPersonId,
}: {
  dogId: string;
  isStaff: boolean;
  currentPersonId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="text-xs text-ink-muted underline underline-offset-2"
      >
        Manual entry
      </button>
      <ManualWalkDialog
        dogId={dogId}
        isStaff={isStaff}
        currentPersonId={currentPersonId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
