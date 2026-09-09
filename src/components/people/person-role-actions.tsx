"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveRole, declineRole } from "@/lib/actions/people";

export function PersonRoleActions({ roleId, personId }: { roleId: string; personId: string }) {
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
    <div className="flex items-center gap-2 mt-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(approveRole)}
        className="h-9 px-3 rounded-[var(--radius)] bg-ok text-white text-sm font-bold disabled:opacity-60"
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
  );
}
