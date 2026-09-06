"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listAllPeople, signIntoSite } from "@/lib/actions/site-visits";

// docs/ui-flows.md §9 — anyone signed in (incl. kiosk) can sign someone in:
// a registered person picked from a list, or a guest (name + phone).
export function SignInDialog({ reasons }: { reasons: { code: string; label: string }[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"person" | "guest">("person");
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [personId, setPersonId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [reason, setReason] = useState(reasons[0]?.code ?? "");
  const [reasonOther, setReasonOther] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    setError(null);
    setMode("person");
    setPersonId("");
    setGuestName("");
    setGuestPhone("");
    setReason(reasons[0]?.code ?? "");
    setReasonOther("");
    listAllPeople().then(setPeople);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIntoSite({
        personId: mode === "person" ? personId || null : null,
        guestName: mode === "guest" ? guestName : "",
        guestPhone: mode === "guest" ? guestPhone : "",
        reason,
        reasonOther,
      });
      if (result.error) setError(result.error);
      else {
        close();
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="h-12 px-6 rounded-[var(--radius)] bg-brand text-white font-bold"
      >
        Sign in
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-[var(--radius)] border border-line p-0 backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold text-lg">Sign in</h2>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("person")}
              className={`h-9 px-3 rounded-full text-sm font-semibold border ${mode === "person" ? "bg-brand text-white border-brand" : "border-line text-ink-muted"}`}
            >
              Registered person
            </button>
            <button
              type="button"
              onClick={() => setMode("guest")}
              className={`h-9 px-3 rounded-full text-sm font-semibold border ${mode === "guest" ? "bg-brand text-white border-brand" : "border-line text-ink-muted"}`}
            >
              Guest
            </button>
          </div>

          {mode === "person" ? (
            <label className="flex flex-col gap-1 text-sm">
              Person
              <select
                required
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Name
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Phone (optional)
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
            >
              {reasons.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {reason === "other" && (
            <label className="flex flex-col gap-1 text-sm">
              What for?
              <input
                type="text"
                required
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white"
              />
            </label>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={close} className="h-10 px-4 rounded-[var(--radius)] font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
