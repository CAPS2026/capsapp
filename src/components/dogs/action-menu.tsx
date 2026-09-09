"use client";

import { useRef, useState } from "react";
import { StartPlacementDialog, type PlacementType } from "@/components/dogs/start-placement-dialog";
import { ManualWalkDialog } from "@/components/dogs/manual-walk-dialog";

type MenuAction = PlacementType | "manual";

const ALL_ROWS: { action: PlacementType; label: string; needs: "kiosk" | "staff" }[] = [
  { action: "yard", label: "Start Yard", needs: "kiosk" },
  { action: "bed_rest", label: "Start Bed Rest", needs: "staff" },
  { action: "jail_break", label: "Start Jail Break", needs: "staff" },
  { action: "foster", label: "Start Foster", needs: "staff" },
];

// One "⋯" icon button (a real 44px tap target), opening a bottom-sheet of
// every action relevant to an Available dog (Paul, 2026-09-06). Staff see
// all of it; a Volunteer Plus sees Start Yard + Manual entry; a plain
// volunteer just gets a Manual-entry link (self only).
export function ActionMenu({
  dogId,
  isStaff,
  canKiosk,
  currentPersonId,
  currentPersonName,
}: {
  dogId: string;
  isStaff: boolean;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
}) {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<MenuAction | null>(null);

  const rows = ALL_ROWS.filter((r) => (r.needs === "staff" ? isStaff : canKiosk));

  function pick(action: MenuAction) {
    sheetRef.current?.close();
    setActive(action);
  }

  if (!canKiosk) {
    return (
      <ManualWalkDialogTrigger
        dogId={dogId}
        canKiosk={false}
        currentPersonId={currentPersonId}
        currentPersonName={currentPersonName}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sheetRef.current?.showModal();
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
          {rows.map((row) => (
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

      {rows.map((row) => (
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
        canKiosk={canKiosk}
        currentPersonId={currentPersonId}
        currentPersonName={currentPersonName}
        isOpen={active === "manual"}
        onClose={() => setActive(null)}
      />
    </>
  );
}

/** Plain-volunteer case: a small trigger, no bottom sheet. */
function ManualWalkDialogTrigger({
  dogId,
  canKiosk,
  currentPersonId,
  currentPersonName,
}: {
  dogId: string;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
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
        canKiosk={canKiosk}
        currentPersonId={currentPersonId}
        currentPersonName={currentPersonName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
