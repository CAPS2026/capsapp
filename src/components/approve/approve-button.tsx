"use client";

import { useState, useTransition } from "react";
import { approveViaToken } from "@/lib/actions/homecare";

export function ApproveButton({
  token,
  personName,
  firstName,
  roleLabel,
}: {
  token: string;
  personName: string;
  firstName: string;
  roleLabel: string;
}) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (state === "done") {
    return (
      <p className="text-sm font-semibold text-ok border-t border-line pt-3">
        Approved. {firstName} can now take a dog out on {roleLabel} — we&apos;ve emailed them to
        let them know.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await approveViaToken(token);
            if (r.ok) setState("done");
            else setError(r.error);
          })
        }
        className="h-12 px-6 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60"
      >
        {isPending ? "Approving…" : `Approve ${personName} for ${roleLabel}`}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
