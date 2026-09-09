"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveRole, declineRole } from "@/lib/actions/people";

export function PersonRoleActions({
  roleId,
  personId,
  approveBlockedReason,
  approveBlockedHref,
}: {
  roleId: string;
  personId: string;
  /** When set, Approve is disabled and this note is shown (e.g. foster
   *  needs the home check first). Decline still works. */
  approveBlockedReason?: string;
  approveBlockedHref?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: typeof approveRole) {
    setError(null);
    startTransition(async () => {
      const result = await fn(roleId, personId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !!approveBlockedReason}
          onClick={() => run(approveRole)}
          className="h-9 px-3 rounded-[var(--radius)] bg-ok text-white text-sm font-bold disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(declineRole)}
          className="h-9 px-3 rounded-[var(--radius)] border border-line-cool text-sm font-semibold disabled:opacity-60"
        >
          Decline
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      {approveBlockedReason && (
        <p className="text-xs text-ink-muted">
          {approveBlockedReason}
          {approveBlockedHref && (
            <>
              {" "}
              <Link href={approveBlockedHref} className="text-brand-ink underline font-semibold">
                Record home check
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
