"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergePeople } from "@/lib/actions/people";
import type { MergeCandidate } from "@/lib/people-data";

export function MergePersonDialog({
  person,
  candidates,
}: {
  person: { id: string; name: string; hasAccount: boolean };
  candidates: MergeCandidate[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState<MergeCandidate | null>(null);
  const [keepThis, setKeepThis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates.slice(0, 8);
    return candidates
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      )
      .slice(0, 12);
  }, [candidates, query]);

  function open() {
    setQuery("");
    setOther(null);
    setKeepThis(true);
    setError(null);
    dialogRef.current?.showModal();
  }

  const bothHaveAccounts = other?.hasAccount && person.hasAccount;
  const keepName = keepThis ? person.name : (other?.name ?? "");
  const removeName = keepThis ? (other?.name ?? "") : person.name;

  function confirm() {
    if (!other) return;
    setError(null);
    const keepId = keepThis ? person.id : other.id;
    const removeId = keepThis ? other.id : person.id;
    startTransition(async () => {
      const res = await mergePeople(keepId, removeId);
      if (res.error) {
        setError(res.error);
        return;
      }
      dialogRef.current?.close();
      router.push(`/people/${keepId}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-sm font-semibold text-ink-muted underline underline-offset-2"
      >
        Merge
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-md"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 className="font-bold text-lg">Merge a duplicate</h2>

          {!other ? (
            <>
              <p className="text-sm text-ink-muted">
                Find the other record for <span className="font-semibold">{person.name}</span>.
              </p>
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or phone"
                className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base"
              />
              <ul className="flex flex-col divide-y divide-line border border-line rounded-[var(--radius)] max-h-64 overflow-y-auto">
                {matches.length === 0 && (
                  <li className="px-3 py-3 text-sm text-ink-muted">No matches.</li>
                )}
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setOther(c)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-tint"
                    >
                      <p className="text-sm font-semibold">
                        {c.name}
                        {c.hasAccount && (
                          <span className="ml-2 text-xs font-normal text-ink-muted">has login</span>
                        )}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "no contact details"} ·{" "}
                        {c.roleSummary}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="text-sm flex flex-col gap-1">
                <p>
                  Keep <span className="font-semibold">{keepName}</span>
                </p>
                <p>
                  Remove <span className="font-semibold">{removeName}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setKeepThis((v) => !v)}
                  className="text-brand-ink font-semibold underline underline-offset-2 self-start"
                >
                  Swap
                </button>
              </div>

              <p className="text-sm text-ink-muted">
                Every role, walk, note and site visit from the removed record moves onto the kept
                one. Blank details on the kept record get filled in from the other. The removed
                record is then deleted — this can&rsquo;t be undone.
              </p>

              {bothHaveAccounts && (
                <p className="text-sm text-danger font-semibold">
                  Both records have a login account. Remove one login before merging.
                </p>
              )}
              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-2 justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setOther(null)}
                  className="h-10 px-4 rounded-[var(--radius)] font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={isPending || bothHaveAccounts}
                  className="h-10 px-4 rounded-[var(--radius)] bg-danger text-white font-bold disabled:opacity-60"
                >
                  {isPending ? "Merging…" : "Merge"}
                </button>
              </div>
            </>
          )}

          {!other && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-10 px-4 rounded-[var(--radius)] font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
