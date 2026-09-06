"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listActiveVolunteers, startWalk } from "@/lib/actions/dog-activity";

// The kiosk case (docs/ui-flows.md §4, "the kiosk name-picker's current
// person"): staff on a shared device need to pick WHO is actually walking
// the dog, not assume it's themselves — that's the real common case per
// Paul (2026-09-07), self-serve login is the rare one. Controlled, opened
// by DogActionButton in place of the instant tap when isStaff.
export function StartWalkDialog({
  dogId,
  currentPersonId,
  isOpen,
  onClose,
}: {
  dogId: string;
  currentPersonId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [volunteers, setVolunteers] = useState<{ id: string; name: string }[]>([]);
  const [walkerId, setWalkerId] = useState(currentPersonId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setWalkerId(currentPersonId);
      listActiveVolunteers().then(setVolunteers);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, currentPersonId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startWalk(dogId, walkerId);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg">Who&apos;s walking?</h2>

        <select
          value={walkerId}
          onChange={(e) => setWalkerId(e.target.value)}
          className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
        >
          <option value={currentPersonId}>Me</option>
          {volunteers
            .filter((v) => v.id !== currentPersonId)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={() => dialogRef.current?.close()} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-4 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
          >
            {isPending ? "Starting…" : "Start Walk"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
