import Image from "next/image";
import { lookupApprovalToken } from "@/lib/actions/homecare";
import { ApproveButton } from "@/components/approve/approve-button";

// Public one-click approval landing page for the link in the homecare
// notification email. The link opens this page; approval only happens when
// a person taps the button (so a mail scanner pre-fetching the URL can't
// approve). The applicant's details are shown here too, so the decision
// can be made entirely from this page or from the email.
export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await lookupApprovalToken(token);

  const message: Record<Exclude<typeof result.state, "valid">, string> = {
    not_found: "This approval link isn't valid.",
    used: "This application has already been approved.",
    expired: "This approval link has expired. Approve from the CAPS app instead.",
    already_active: "This person is already an approved carer — nothing to do.",
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-16">
      <Image src="/logo.jpg" alt="CAPS" width={64} height={64} className="rounded-full" priority />
      <div className="w-full max-w-md bg-card border border-line rounded-[var(--radius)] p-6 flex flex-col gap-4">
        {result.state === "valid" ? (
          <>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                Homecare approval
              </p>
              <h1 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
                {result.personName}
              </h1>
              <p className="text-sm text-ink-muted">
                Applied to be a <strong className="text-ink">{result.roleLabel}</strong> carer.
              </p>
            </div>

            <dl className="flex flex-col gap-1 text-sm border-t border-line pt-3">
              {result.email && <Row label="Email" value={result.email} />}
              {result.phone && <Row label="Phone" value={result.phone} />}
              {result.address && <Row label="Address" value={result.address} />}
              {result.experience && <Row label="Experience" value={result.experience} />}
            </dl>

            <p className="text-xs text-ink-muted">
              Approving lets {result.firstName} take a dog out on {result.roleLabel}. They&apos;ll
              get an email confirming it.
            </p>

            <ApproveButton
              token={token}
              personName={result.personName}
              firstName={result.firstName}
              roleLabel={result.roleLabel}
            />
          </>
        ) : (
          <p className="text-sm text-ink-muted text-center">{message[result.state]}</p>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-ink-muted w-20 shrink-0">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
