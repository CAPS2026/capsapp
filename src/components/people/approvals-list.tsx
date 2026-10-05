import Link from "next/link";
import type { PendingApproval } from "@/lib/people-data";
import { ROLE_BADGE_CLASS, ROLE_LABEL } from "@/lib/people";
import { formatDate } from "@/lib/format";
import { PersonRoleActions } from "@/components/people/person-role-actions";

// Everything waiting on an approval, in one place at the top of People
// (Paul, 2026-10-04). Only the named approvers can approve or decline; anyone
// else on staff sees the list but is told it needs them. It rolls down so it
// stays out of the way of the people list until it's needed (Paul, 2026-10-04). Foster rows link to
// the home check until one has passed.
export function ApprovalsList({ items, viewerCanApprove }: { items: PendingApproval[]; viewerCanApprove: boolean }) {
  if (items.length === 0) return null;

  return (
    <details className="group border border-warm rounded-[var(--radius)] bg-warm-tint">
      <summary className="flex items-center justify-between cursor-pointer list-none px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-warm-ink">
        <span>Awaiting approval ({items.length})</span>
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul className="flex flex-col divide-y divide-warm/30 px-3 pb-2">
        {items.map((a) => (
          <li key={a.roleId} className="py-2 flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/people/${a.personId}`} className="font-semibold text-ink underline underline-offset-2">
                {a.personName}
              </Link>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE_CLASS[a.role]}`}>
                {ROLE_LABEL[a.role]}
              </span>
              {a.isMinor && <span className="text-xs font-bold text-warm-ink">U18 · parent consent</span>}
              {a.appliedOn && <span className="text-xs text-ink">Applied {formatDate(a.appliedOn)}</span>}
            </div>
            {viewerCanApprove ? (
              <PersonRoleActions
                roleId={a.roleId}
                personId={a.personId}
                approveBlockedReason={a.blockedReason}
                approveBlockedHref={a.blockedHref}
              />
            ) : (
              <p className="text-xs text-ink">
                Needs Paul, Julie or Shayna to approve.
                {a.blockedHref && (
                  <>
                    {" "}
                    <Link href={a.blockedHref} className="text-brand-ink underline font-semibold">
                      Record home check
                    </Link>
                  </>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
