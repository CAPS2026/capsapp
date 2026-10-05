"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveCarers, listActiveVolunteers, logManualActivity } from "@/lib/actions/dog-activity";
import { DateTimeField } from "@/components/dogs/datetime-field";
import { YARD_OPTIONS } from "@/components/dogs/start-placement-dialog";

type EntryType = "walk" | "yard" | "bed_rest" | "jail_break" | "foster";

const TYPE_LABEL: Record<EntryType, string> = {
  walk: "Walk",
  yard: "Yard",
  bed_rest: "Bed Rest",
  jail_break: "Jail Break",
  foster: "Foster",
};

// "Manual entry" is the old AppSheet app's own term (Is_Manual_Entry on the
// Walks table) for logging something that already happened — kept rather
// than inventing new wording (docs/ui-flows.md §6). Since 2026-10-04 it has
// an Activity dropdown at the top so any activity can be entered after the
// fact (Paul); which options appear, and who can be picked, follows the
// same rules as starting one live: a plain volunteer only gets Walk (for
// themselves), a kiosk operator also Yard, staff everything, and only
// active carers of the right type can be picked for Jail Break / Foster.
// Controlled — opened from ActionMenu.
export function ManualEntryDialog({
  dogId,
  isStaff,
  canKiosk,
  currentPersonId,
  currentPersonName,
  isOpen,
  onClose,
}: {
  dogId: string;
  isStaff: boolean;
  canKiosk: boolean;
  currentPersonId: string;
  currentPersonName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const types: EntryType[] = isStaff
    ? ["walk", "yard", "bed_rest", "jail_break", "foster"]
    : canKiosk
      ? ["walk", "yard"]
      : ["walk"];

  const [type, setType] = useState<EntryType>("walk");
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [personId, setPersonId] = useState(currentPersonId);
  const [yard, setYard] = useState(YARD_OPTIONS[0]);
  const [checkOut, setCheckOut] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setType("walk");
      setPersonId(currentPersonId);
      setYard(YARD_OPTIONS[0]);
      setCheckOut("");
      setCheckIn("");
      setNotes("");
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, currentPersonId]);

  // The pick-list follows the activity: walkers for a walk, active carers of
  // the matching type for Jail Break / Foster.
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    if (type === "walk") {
      setPersonId(currentPersonId);
      if (canKiosk) listActiveVolunteers().then((l) => live && setPeople(l));
    } else if (type === "jail_break" || type === "foster") {
      setPersonId("");
      setPeople([]);
      listActiveCarers(type).then((l) => live && setPeople(l));
    }
    return () => {
      live = false;
    };
  }, [isOpen, type, canKiosk, currentPersonId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logManualActivity({
        dogId,
        type,
        personId: personId || undefined,
        checkOut: checkOut ? new Date(checkOut).toISOString() : "",
        checkIn: checkIn ? new Date(checkIn).toISOString() : "",
        notes,
        yard: type === "yard" ? yard : undefined,
      });
      if (result.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  const isCarerType = type === "jail_break" || type === "foster";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg">Manual entry</h2>
        <p className="text-sm text-ink -mt-2">
          For something that already happened without using the app — nobody tapped Start or End.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Activity
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntryType)}
            className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        {type === "walk" && canKiosk && (
          <label className="flex flex-col gap-1 text-sm">
            Volunteer
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              <option value={currentPersonId}>{currentPersonName}</option>
              {people
                .filter((v) => v.id !== currentPersonId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </label>
        )}

        {isCarerType && (
          <label className="flex flex-col gap-1 text-sm">
            Carer
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              <option value="" disabled>
                Choose a carer…
              </option>
              {people.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {people.length === 0 && <span className="text-xs text-ink">No active carers of this type found.</span>}
          </label>
        )}

        {type === "yard" && (
          <label className="flex flex-col gap-1 text-sm">
            Which yard
            <select
              value={yard}
              onChange={(e) => setYard(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              {YARD_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-col gap-1 text-sm">
          <span>Check Out</span>
          <DateTimeField required value={checkOut} onChange={setCheckOut} />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span>Check In</span>
          <DateTimeField required value={checkIn} onChange={setCheckIn} />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          {type === "bed_rest" ? "Notes" : "Notes (optional)"}
          <textarea
            required={type === "bed_rest"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
