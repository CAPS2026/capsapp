import Link from "next/link";
import type { PendingApproval } from "@/lib/people-data";
import { ROLE_BADGE_CLASS, ROLE_LABEL } from "@/lib/people";
import { formatDate } from "@/lib/format";
import { PersonRoleActions } from "@/components/people/person-role-actions";

// Everything waiting on an approval, in one place at the top of People
// (Paul, 2026-10-04). Only admins can approve or decline; anyone else on
// staff sees the list but is told it needs an admin. Foster rows link to
// the home check until one has passed.
export function ApprovalsList({ items, viewerIsAdmin }: { items: PendingApproval[]; viewerIsAdmin: boolean }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 border border-warm rounded-[var(--radius)] bg-warm-tint p-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-warm-ink">
        Awaiting approval ({items.length})
      </h2>
      <ul className="flex flex-col divide-y divide-warm/30">
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
            {viewerIsAdmin ? (
              <PersonRoleActions
                roleId={a.roleId}
                personId={a.personId}
                approveBlockedReason={a.blockedReason}
                approveBlockedHref={a.blockedHref}
              />
            ) : (
              <p className="text-xs text-ink">
                Needs an admin to approve.
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
    </section>
  );
}
