import Image from "next/image";
import { VOLUNTEER_TERMS } from "@/lib/terms";

// Public terms page (also linked from the Google sign-in consent screen).
export const metadata = { title: "Terms — CAPS App" };

export default function TermsPage() {
  return (
    <main className="flex-1 px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-5 text-sm leading-relaxed text-ink">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="CAPS" width={56} height={56} className="rounded-full" />
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Terms of use
          </h1>
        </div>

        <p>
          The CAPS App is used by Cape Animal Protection Shelter Inc. (CAPS) to look after its dogs and the people who
          help. By registering or signing in you agree to use it honestly, to keep other people&apos;s details
          private, and to follow the shelter&apos;s guidelines and instructions.
        </p>

        <h2 className="text-lg font-bold">Volunteer terms and conditions</h2>
        <div className="whitespace-pre-wrap border border-line rounded-[var(--radius)] p-4 bg-card">
          {VOLUNTEER_TERMS}
        </div>

        <p>
          How we handle your information is explained in our{" "}
          <a href="/apply/privacy" className="text-brand-ink underline">
            privacy policy
          </a>
          .
        </p>
      </div>
    </main>
  );
}
