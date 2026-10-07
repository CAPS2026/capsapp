"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveHealthConcernByToken } from "@/lib/actions/health-link";

/** The button on the page behind the email link. Opening that page changes
 *  nothing: it is only marked as dealt with when this is pressed. */
export function HealthLinkButton({ token }: { token: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await resolveHealthConcernByToken(token, note);
      if (r.error) setError(r.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (done) return <p className="m-0 text-sm font-bold text-ok">Done. It is marked as dealt with.</p>;

  return (
    <div className="flex flex-col gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was done? (optional)"
        className="h-9 rounded-[var(--radius)] border border-line-cool bg-white px-3 text-sm"
      />
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={save}
        className="h-11 rounded-[var(--radius)] bg-ok text-sm font-bold text-white disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Mark as dealt with"}
      </button>
    </div>
  );
}
