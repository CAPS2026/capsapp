import { getCurrentPerson } from "@/lib/auth";
import { getRosterablePeople } from "@/lib/shift-data";
import { getAllLeaveRequests, getMyLeaveRequests, resolveRequester } from "@/lib/leave-data";
import { LEAVE_SCOPE_LABEL, LEAVE_TYPE_LABEL, formatLeaveDates } from "@/lib/leave";
import { DecisionButtons, LeaveForm, MyRequests, NotYouButton, StatusBadge, WhoAreYou } from "@/components/shift/leave-forms";

/** The Leave tab: a caretaker asks for leave, sees the answer, and admins
 *  (Julie, Shayna, Renee) decide. Reasons are only ever shown to admins,
 *  never on the shared tablet. */
export default async function LeavePage() {
  const [me, requester] = await Promise.all([getCurrentPerson(), resolveRequester()]);
  const isAdmin = me?.isAdmin === true;

  const [people, mine, all] = await Promise.all([
    requester ? Promise.resolve([]) : getRosterablePeople(),
    requester ? getMyLeaveRequests(requester.id) : Promise.resolve([]),
    isAdmin ? getAllLeaveRequests() : Promise.resolve([]),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="m-0 rounded-md bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-ink">
        Unwell today? Phone Shayna. Don&rsquo;t use this form.
      </p>

      {requester ? (
        <>
          <div className="flex items-center justify-between">
            <p className="m-0 text-sm font-bold">Asking as {requester.name}</p>
            <NotYouButton name={requester.name} />
          </div>
          <LeaveForm />
          <h2 className="m-0 mt-2 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Your requests
          </h2>
          <MyRequests requests={mine} />
        </>
      ) : (
        <WhoAreYou people={people} />
      )}

      {isAdmin && (
        <section className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            All leave requests (admins)
          </h2>
          {all.length === 0 && <p className="m-0 text-sm text-ink-muted">No leave requests yet.</p>}
          {all.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="m-0 text-sm font-extrabold">{r.personName}</p>
                  <p className="m-0 text-sm">{formatLeaveDates(r.startDate, r.endDate)}</p>
                  <p className="m-0 text-xs text-ink-muted">
                    {LEAVE_TYPE_LABEL[r.leaveType]} &middot; {LEAVE_SCOPE_LABEL[r.scope]}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.note && <p className="m-0 text-xs">Reason: {r.note}</p>}
              {r.decisionNote && <p className="m-0 text-xs text-ink-muted">Message sent: {r.decisionNote}</p>}
              {r.status === "pending" && <DecisionButtons id={r.id} />}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
