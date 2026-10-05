"use client";

import { useState } from "react";
import { VolunteerForm } from "@/components/apply/volunteer-form";

// Wraps the public form so the intro line and the "already registered" footer
// only show while someone is filling it in — not on the thank-you screen.
export function ApplyShell({ homecareFirst, intro }: { homecareFirst: boolean; intro: string }) {
  const [finished, setFinished] = useState(false);
  return (
    <>
      {!finished && <p className="text-sm text-ink max-w-sm mx-auto text-center -mt-3">{intro}</p>}

      <div className="bg-card border border-line rounded-[var(--radius)] p-5">
        <VolunteerForm homecareFirst={homecareFirst} onDone={() => setFinished(true)} />
      </div>

      {!finished && (
        <p className="text-xs text-ink text-center">
          Already registered? You&apos;re good to go — check in with a caretaker when you&apos;re at the shelter.
        </p>
      )}
    </>
  );
}
