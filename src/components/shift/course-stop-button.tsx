"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stopMedicationByToken } from "@/lib/actions/medication-link";

/** The button on the page behind the email link. Opening that page changes
 *  nothing: the medication is only stopped when this is pressed. */
export function CourseStopButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function stop() {
    setError(null);
    startTransition(async () => {
      const r = await stopMedicationByToken(token);
      if (r.error) setError(r.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (done) return <p className="m-0 text-sm font-bold text-ok">Done. It has been stopped and is off the checklist.</p>;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={stop}
        className="h-11 rounded-[var(--radius)] bg-[#16A34A] text-sm font-bold text-white disabled:opacity-50"
      >
        {isPending ? "Stopping…" : "Stop this medication"}
      </button>
    </div>
  );
}
