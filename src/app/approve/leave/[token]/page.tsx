import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeaveByToken, getLeaveContext } from "@/lib/leave-data";
import { LEAVE_SCOPE_LABEL, LEAVE_TYPE_LABEL, formatLeaveDates } from "@/lib/leave";
import { DecisionButtons, StatusBadge } from "@/components/shift/leave-forms";

// Public landing page for the link in the leave request email (the
// /approve prefix is already open to people who aren't logged in). Opening
// the page changes nothing: a decision is only made when someone presses
// Approve or Decline, so a mail scanner pre-fetching the link can't decide.
export default async function LeaveDecisionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const req = await getLeaveByToken(admin, token);
  const context = req ? await getLeaveContext(admin, req) : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <Image src="/logo.jpg" alt="CAPS" width={64} height={64} className="rounded-full" priority />
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[var(--radius)] border border-line bg-card p-6">
        {!req ? (
          <p className="m-0 text-center text-sm text-ink-muted">This leave link isn&apos;t valid.</p>
        ) : (
          <>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-ink-muted">Leave request</p>
              <h1 className="m-0 text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {req.personName}
              </h1>
            </div>
            <div className="m-0 flex flex-col gap-1 border-t border-line pt-3 text-sm">
              <p className="m-0"><b>Type:</b> {LEAVE_TYPE_LABEL[req.leaveType]}</p>
              <p className="m-0"><b>Dates:</b> {formatLeaveDates(req.startDate, req.endDate)}</p>
              <p className="m-0"><b>Shifts:</b> {LEAVE_SCOPE_LABEL[req.scope]}</p>
              <p className="m-0"><b>Reason:</b> {req.note ?? "None given"}</p>
            </div>
            {context && context.affected.length > 0 && (
              <div className="text-sm">
                <p className="m-0 font-bold">Rostered shifts this covers</p>
                <ul className="m-0 list-disc pl-5">
                  {context.affected.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {context && context.overlapping.length > 0 && (
              <div className="text-sm">
                <p className="m-0 font-bold">Others also asking for or on leave</p>
                <ul className="m-0 list-disc pl-5">
                  {context.overlapping.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {req.status === "pending" ? (
              <DecisionButtons token={token} />
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge status={req.status} />
                <span className="text-ink-muted">This request has already been dealt with.</span>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
