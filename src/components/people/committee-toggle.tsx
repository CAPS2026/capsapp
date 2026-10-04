"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCommittee } from "@/lib/actions/people";

export function CommitteeToggle({
  personId,
  firstName,
  email,
  isMember,
}: {
  personId: string;
  firstName: string;
  email: string | null;
  isMember: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [justGranted, setJustGranted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(on: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await setCommittee(personId, on);
      if (r.error) setError(r.error);
      else {
        setJustGranted(on);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">
          {isMember ? (
            <span className="font-semibold text-brand-ink">Committee member</span>
          ) : (
            <span className="text-ink-muted">Not a committee member</span>
          )}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => toggle(!isMember)}
          className={`h-9 px-3 rounded-[var(--radius)] text-sm font-bold disabled:opacity-60 ${
            isMember ? "border border-line-cool" : "bg-brand text-white"
          }`}
        >
          {isPending ? "…" : isMember ? "Remove" : "Make committee member"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {justGranted && (
        <p className="text-xs text-ink-muted">
          Tell {firstName} to sign in at <strong>capsapp-five.vercel.app/login</strong>
          {email ? (
            <>
              {" "}
              with <strong>{email}</strong>
            </>
          ) : null}
          . They can then see everything staff can, except the Staff app roster.
        </p>
      )}
    </div>
  );
}
