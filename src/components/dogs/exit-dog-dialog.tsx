"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exitDog } from "@/lib/actions/dogs";
import { EXIT_TYPES, type ExitTypeCode } from "@/lib/dog-exit";

export type ExitPerson = { id: string; name: string };

const field = "mt-1 block w-full h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base font-normal";

// "Exit dog" - the dog has left CAPS. Rendered as an item inside the Manage menu.
export function ExitDogDialog({
  dogId,
  dogName,
  status,
  slListed,
  people,
  onOpen,
}: {
  dogId: string;
  dogName: string;
  status: string;
  slListed: boolean;
  people: ExitPerson[];
  onOpen?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [exitType, setExitType] = useState<ExitTypeCode>("adopted");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [enquiry, setEnquiry] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const stillOut = status !== "available";
  const needsPerson = exitType === "adopted" || exitType === "reclaimed";
  const matches = query.trim()
    ? people.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];
  const chosen = people.find((p) => p.id === personId) ?? null;

  function open() {
    setError(null);
    // Today in Weipa (UTC+10), not the browser's zone.
    setDate(new Date(Date.now() + 10 * 3_600_000).toISOString().slice(0, 10));
    onOpen?.();
    dialogRef.current?.showModal();
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await exitDog(dogId, {
        exitType,
        exitDate: date,
        notes,
        personId: needsPerson ? personId : null,
        enquiryNumber: enquiry,
      });
      if (r.error) setError(r.error);
      else {
        dialogRef.current?.close();
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="block w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-gray-tint border-t border-line"
      >
        Exit dog
      </button>
      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">Exit {dogName}?</h2>
          {stillOut ? (
            <p className="text-sm text-danger">
              {dogName} is still out. Bring them back (or end the foster / jail break) before exiting them.
            </p>
          ) : (
            <>
              <label className="text-sm font-semibold">
                Why is {dogName} leaving?
                <select value={exitType} onChange={(e) => setExitType(e.target.value as ExitTypeCode)} className={field}>
                  {EXIT_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </label>
              {needsPerson && (
                <div className="text-sm font-semibold">
                  {exitType === "adopted" ? "Adopter" : "Who took the dog (optional)"}
                  {chosen ? (
                    <p className="mt-1 flex items-center justify-between rounded-[var(--radius)] border border-line-cool px-3 h-11 font-normal">
                      {chosen.name}
                      <button type="button" className="text-brand-ink font-semibold" onClick={() => setPersonId(null)}>
                        Change
                      </button>
                    </p>
                  ) : (
                    <>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a name"
                        className={field}
                      />
                      {matches.length > 0 && (
                        <ul className="mt-1 border border-line rounded-[var(--radius)] divide-y divide-line font-normal">
                          {matches.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-tint"
                                onClick={() => {
                                  setPersonId(p.id);
                                  setQuery("");
                                }}
                              >
                                {p.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {query.trim() && matches.length === 0 && (
                        <p className="mt-1 text-xs font-normal text-ink-muted">
                          No one by that name. Add them under People first.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
              {exitType === "adopted" && (
                <label className="text-sm font-semibold">
                  SavourLife enquiry number (optional)
                  <input value={enquiry} onChange={(e) => setEnquiry(e.target.value)} className={field} />
                </label>
              )}
              <label className="text-sm font-semibold">
                Notes (optional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 rounded-[var(--radius)] border border-line-cool bg-white text-base font-normal"
                />
              </label>
              {exitType === "adopted" && slListed && (
                <p className="text-sm rounded-[var(--radius)] bg-warm-tint border border-warm p-2">
                  Remember to mark {dogName} as <strong>Adopted</strong> on SavourLife too. This record will say Adopted.
                </p>
              )}
              <p className="text-xs text-ink-muted">
                {dogName} drops off the Dogs list. Find them under Exited, where they can be brought back if this was a mistake.
              </p>
            </>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => dialogRef.current?.close()} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
              Cancel
            </button>
            {!stillOut && (
              <button
                type="button"
                disabled={isPending}
                onClick={save}
                className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Exit dog"}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
