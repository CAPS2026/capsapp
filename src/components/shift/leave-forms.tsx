"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LEAVE_SCOPES,
  LEAVE_SCOPE_LABEL,
  LEAVE_STATUS_LABEL,
  formatLeaveDates,
  type LeaveRequestRow,
} from "@/lib/leave";
import {
  cancelApprovedLeave,
  cancelLeaveRequest,
  decideLeaveByToken,
  decideLeaveRequest,
  forgetPerson,
  identifyPerson,
  submitLeaveRequest,
} from "@/lib/actions/leave";
import { firstName } from "@/lib/shift";
import { PersonAvatar } from "@/components/shift/person-avatar";

const FIELD = "rounded-[var(--radius)] border border-line-cool bg-white px-3 py-2 text-sm font-normal";

/** Pop-up shell. Like the other pop-ups it does NOT close on a click outside
 *  or on Escape, so nobody loses what they have typed. */
function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col gap-3 overflow-y-auto rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      >
        <h2 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<LeaveRequestRow["status"], string> = {
  pending: "bg-warm-tint text-warm-ink",
  approved: "bg-[#E9F5EF] text-ok",
  declined: "bg-[#FCEDE8] text-[#9A3A26]",
  cancelled: "bg-gray-tint text-ink-muted",
};

export function StatusBadge({ status }: { status: LeaveRequestRow["status"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${STATUS_STYLE[status]}`}>
      {LEAVE_STATUS_LABEL[status]}
    </span>
  );
}

/** The Roster tab's "Ask for leave" button and its pop-up. It always starts
 *  by asking who you are (a tap on your name, on any device), so the last
 *  person's requests are never on show and nobody's request goes in under
 *  the device's login. */
export function AskForLeave({
  requester,
  people,
  mine,
}: {
  requester: { id: string; name: string; via: "cookie" | "login" } | null;
  people: { id: string; name: string }[];
  mine: LeaveRequestRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [isPending, startTransition] = useTransition();

  const known = identified ? requester !== null : requester?.via === "login";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIdentified(false);
          setOpen(true);
        }}
        className="h-11 rounded-[var(--radius)] bg-brand px-4 text-sm font-bold text-white"
      >
        Ask for leave
      </button>

      {open && (
        <Modal title={known ? "Leave" : "Who are you?"}>
          {!known ? (
            identified ? (
              <p className="m-0 text-sm text-ink-muted">One moment&hellip;</p>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await identifyPerson(p.id);
                          if (!r.error) {
                            setIdentified(true);
                            router.refresh();
                          }
                        })
                      }
                      className="flex flex-col items-center gap-1.5 rounded-[var(--radius)] border-[1.5px] border-line bg-card px-1.5 pb-3 pt-3.5 disabled:opacity-50"
                    >
                      <PersonAvatar name={p.name} size={34} />
                      <span className="text-xs font-extrabold text-foreground">{firstName(p.name)}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 self-start rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted"
                >
                  Close
                </button>
              </>
            )
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="m-0 text-sm font-bold">Asking as {requester!.name}</p>
                {requester!.via === "cookie" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await forgetPerson();
                        setIdentified(false);
                        router.refresh();
                      })
                    }
                    className="text-xs font-bold text-brand-ink disabled:opacity-50"
                  >
                    Not {firstName(requester!.name)}? Switch person
                  </button>
                )}
              </div>
              <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
                Unwell today? Phone Shayna. Don&rsquo;t use this form.
              </p>
              <LeaveForm />
              <h3 className="m-0 mt-1 text-sm font-extrabold">Your requests</h3>
              <MyRequests requests={mine} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 self-start rounded-[var(--radius)] border border-line px-4 text-sm font-bold text-ink-muted"
              >
                Close
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function LeaveForm() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scope, setScope] = useState("all");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ emailed: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await submitLeaveRequest({ startDate, endDate: endDate || startDate, scope, note });
      if (r.error) {
        setError(r.error);
        return;
      }
      setResult({ emailed: r.emailed === true });
      router.refresh();
    });
  }

  if (result) {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-card p-3">
        {result.emailed ? (
          <p className="m-0 text-sm font-semibold leading-relaxed">Request sent. You will see the answer here.</p>
        ) : (
          <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold leading-relaxed text-warm-ink">
            Your request has been saved, but it was NOT emailed to Shayna. Please tell her yourself.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setStartDate("");
            setEndDate("");
            setScope("all");
            setNote("");
          }}
          className="h-9 self-start rounded-[var(--radius)] border border-line-cool px-3 text-sm font-bold text-brand-ink"
        >
          Make another request
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold">
          First day
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${FIELD} h-10`} required />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold">
          Last day (blank for one day)
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={`${FIELD} h-10`} />
        </label>
      </div>

      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-bold">Which shifts</legend>
        {LEAVE_SCOPES.map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm font-semibold">
            <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} className="h-4 w-4" />
            {LEAVE_SCOPE_LABEL[s]}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-xs font-bold">
        Anything Shayna should know (optional)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} />
      </label>

      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="h-11 rounded-[var(--radius)] bg-brand text-sm font-bold text-white disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

/** The person's own requests, newest first. No reasons shown. Pending and
 *  declined show here for that person only; approved leave also shows on
 *  the roster for everyone. */
function MyRequests({ requests }: { requests: LeaveRequestRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (requests.length === 0) return <p className="m-0 text-sm text-ink-muted">You have no leave requests yet.</p>;
  return (
    <div className="flex flex-col divide-y divide-line rounded-[var(--radius)] border border-line bg-card">
      {requests.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div>
            <p className="m-0 text-sm font-bold">{formatLeaveDates(r.startDate, r.endDate)}</p>
            <p className="m-0 text-xs text-ink-muted">{LEAVE_SCOPE_LABEL[r.scope]}</p>
            {r.decisionNote && <p className="m-0 mt-0.5 text-xs">Message: {r.decisionNote}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={r.status} />
            {r.status === "pending" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await cancelLeaveRequest(r.id);
                    router.refresh();
                  })
                }
                className="text-xs font-bold text-ink-muted disabled:opacity-50"
              >
                Withdraw
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Approve and decline, with an optional message back to the person. Used
 *  both in the app (`id`) and from the email link (`token`). */
export function DecisionButtons({ id, token }: { id?: string; token?: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "approved" | "declined") {
    setError(null);
    startTransition(async () => {
      const r = token ? await decideLeaveByToken(token, decision, note) : await decideLeaveRequest(id!, decision, note);
      if (r.error) setError(r.error);
      else {
        setDone(decision);
        router.refresh();
      }
    });
  }

  if (done) return <p className="m-0 text-sm font-bold text-ok">Done. It has been {done}, and they have been told.</p>;

  return (
    <div className="flex flex-col gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Message to them (optional)"
        className={`${FIELD} h-9`}
      />
      {error && <p className="m-0 text-sm font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("approved")}
          className="h-10 flex-1 rounded-[var(--radius)] bg-ok text-sm font-bold text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("declined")}
          className="h-10 flex-1 rounded-[var(--radius)] border-[1.5px] border-danger text-sm font-bold text-danger disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

/** Admins only: take approved leave off the roster. Asks first. */
export function CancelLeaveButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="self-start text-xs font-bold text-ink-muted">
        Cancel this leave
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold">Cancel this leave and take it off the roster?</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await cancelApprovedLeave(id);
            if (r.error) setError(r.error);
            else router.refresh();
          })
        }
        className="font-bold text-danger disabled:opacity-50"
      >
        Yes, cancel it
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="font-bold text-ink-muted">
        No
      </button>
      {error && <span className="font-semibold text-danger">{error}</span>}
    </div>
  );
}
