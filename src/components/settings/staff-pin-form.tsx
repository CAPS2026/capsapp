"use client";

import { useState, useTransition } from "react";
import { setStaffPin } from "@/lib/actions/cafe";
import { PIN_MAX } from "@/lib/cafe";

export function StaffPinForm({ pinIsSet }: { pinIsSet: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next !== confirm) {
      setError("The two new-PIN boxes don't match.");
      return;
    }
    startTransition(async () => {
      const res = await setStaffPin(current, next);
      if ("error" in res) {
        setError(res.error);
      } else {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  }

  const box =
    "h-12 px-3 rounded-[var(--radius)] border border-line text-lg tracking-[0.4em] text-center";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">
        One shared PIN (4–6 digits) that a staff member enters to switch a device back from
        volunteer mode to full access. Keep it off the shared iPad&rsquo;s notes.
      </p>

      {pinIsSet && (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Current PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={PIN_MAX}
            value={current}
            onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
            className={box}
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm font-semibold">
        {pinIsSet ? "New PIN" : "PIN"}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PIN_MAX}
          value={next}
          onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))}
          className={box}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        Confirm {pinIsSet ? "new PIN" : "PIN"}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PIN_MAX}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          className={box}
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm text-ok font-semibold">PIN saved.</p>}

      <button
        type="submit"
        disabled={isPending || next.length < 4 || confirm.length < 4}
        className="h-11 px-4 rounded-[var(--radius)] bg-ok text-white font-bold disabled:opacity-60 self-start"
      >
        {isPending ? "Saving…" : pinIsSet ? "Change PIN" : "Set PIN"}
      </button>
    </form>
  );
}
