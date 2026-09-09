"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVolunteerPlus } from "@/lib/actions/people";

export function VolunteerPlusToggle({
  personId,
  firstName,
  email,
  isPlus,
}: {
  personId: string;
  firstName: string;
  email: string | null;
  isPlus: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [justGranted, setJustGranted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(on: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await setVolunteerPlus(personId, on);
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
          {isPlus ? (
            <span className="font-semibold text-brand-ink">Volunteer Plus</span>
          ) : (
            <span className="text-ink-muted">Not a Volunteer Plus</span>
          )}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => toggle(!isPlus)}
          className={`h-9 px-3 rounded-[var(--radius)] text-sm font-bold disabled:opacity-60 ${
            isPlus ? "border border-line-cool" : "bg-brand text-white"
          }`}
        >
          {isPending ? "…" : isPlus ? "Remove" : "Make Volunteer Plus"}
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
          . They can then check people in and out themselves.
        </p>
      )}
    </div>
  );
}
