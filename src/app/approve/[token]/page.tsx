import Image from "next/image";
import { lookupApprovalToken } from "@/lib/actions/homecare";
import { ApproveButton } from "@/components/approve/approve-button";

// Public one-click approval landing page for the link in the homecare
// notification email. The link opens this page; the actual approval only
// happens when a person taps the button (so a mail scanner pre-fetching
// the URL can't approve anything).
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
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Image src="/logo.jpg" alt="CAPS" width={72} height={72} className="rounded-full" priority />
      <div className="w-full max-w-sm bg-card border border-line rounded-[var(--radius)] p-6 flex flex-col gap-4">
        {result.state === "valid" ? (
          <>
            <h1 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              Approve homecare application
            </h1>
            <p className="text-sm text-ink-muted">
              {result.personName} has applied to be a <strong>{result.roleLabel}</strong> carer.
              Approving lets them take a dog out on {result.roleLabel}.
            </p>
            <ApproveButton
              token={token}
              personName={result.personName}
              roleLabel={result.roleLabel}
            />
          </>
        ) : (
          <p className="text-sm text-ink-muted">{message[result.state]}</p>
        )}
      </div>
    </main>
  );
}
