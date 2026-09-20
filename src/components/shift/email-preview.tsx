"use client";

import { useEffect, useState, useTransition } from "react";
import { PART_LABEL, clock12, parseYmd, type Part } from "@/lib/shift";
import { previewShiftEmail } from "@/lib/actions/shift";
import type { EmailPreview, PersonBlock } from "@/lib/shift-email";
import { PersonAvatar } from "@/components/shift/person-avatar";

/** "Preview tonight's email to Renee" from the mockup: a read-only look
 *  at what the end-of-shift email would say right now. Built by the same
 *  code as the real email (see getShiftEmailPreview), sends nothing. */
export function EmailPreviewLink({ part }: { part: Part }) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function show() {
    setError(null);
    startTransition(async () => {
      const r = await previewShiftEmail();
      if ("preview" in r) {
        setPreview(r.preview);
        setOpen(true);
      } else {
        setError(r.error);
      }
    });
  }

  // Afternoon shift email lands "tonight"; a morning one doesn't.
  const label = part === "afternoon" ? "tonight’s" : "this morning’s";

  return (
    <>
      <button
        type="button"
        onClick={show}
        disabled={isPending}
        className="flex items-center gap-2 text-left text-sm font-bold text-brand-ink disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
        <span>
          Preview {label} email to Renee <span aria-hidden="true">&rarr;</span>
        </span>
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {open && preview && <EmailModal preview={preview} onClose={() => setOpen(false)} />}
    </>
  );
}

function EmailModal({ preview, onClose }: { preview: EmailPreview; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const day = parseYmd(preview.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const title = preview.part === "afternoon" ? "Tonight’s shift email" : "This morning’s shift email";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,44,42,0.4)] p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[560px] flex-col gap-3.5 overflow-y-auto rounded-[14px] bg-background p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-sm font-bold text-brand-ink">
            Close &times;
          </button>
        </div>
        <p className="text-[11.5px] text-ink-muted">
          To: Renee (Employee Coordinator) and Shayna (President) &middot; {PART_LABEL[preview.part]} shift, {day}
        </p>

        {!preview.hasRecipients && (
          <p className="rounded-md bg-warm-tint px-2 py-1.5 text-xs font-semibold text-warm-ink">
            Nobody is set up to receive this email yet, so nothing would be sent.
          </p>
        )}

        {preview.people.length === 0 && <p className="text-sm text-ink-muted">Nobody has signed in to this shift yet.</p>}

        {preview.people.map((p) => (
          <PersonEmailBlock key={p.name} block={p} />
        ))}

        {preview.unclaimed.length > 0 && (
          <div className="rounded-[var(--radius)] border border-[#F0D69A] bg-warm-tint p-3 text-xs leading-relaxed">
            <b className="font-extrabold">Not done, nobody claimed it ({preview.unclaimed.length}):</b>{" "}
            {preview.unclaimed.join(", ")}
          </div>
        )}

        <p className="m-0 text-[11px] leading-relaxed text-ink-muted">
          Sent automatically when the last person on this shift signs out. A task with no name against it (nobody
          claimed it, nobody ticked it) is listed once under the shift as a whole, not attached to any one person.
        </p>
      </div>
    </div>
  );
}

function PersonEmailBlock({ block }: { block: PersonBlock }) {
  const lines: Array<[string, string[]]> = [
    ["Done", block.done],
    ["Not needed", block.notNeeded],
    ["Claimed, not done", block.claimedNotDone],
    ["Extra, off the checklist", block.extraDone],
  ];
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line p-3">
      <div className="flex items-center gap-2">
        <PersonAvatar name={block.name} size={26} />
        <span className="text-[13.5px] font-extrabold text-foreground">{block.name}</span>
        <span className="text-[11px] text-ink-muted">
          signed in {clock12(block.startedAt)} &middot; {block.endedAt ? `out ${clock12(block.endedAt)}` : "still signed in"}
        </span>
      </div>
      {block.flags.map((f) => (
        <span key={f} className="w-fit rounded-md bg-warm-tint px-2 py-0.5 text-[11px] font-bold text-warm-ink">
          {f}
        </span>
      ))}
      {lines.map(([label, items]) =>
        items.length ? (
          <p key={label} className="m-0 text-xs leading-relaxed">
            <b className="font-extrabold">
              {label} ({items.length}):
            </b>{" "}
            {items.join(", ")}
          </p>
        ) : null,
      )}
      {lines.every(([, items]) => items.length === 0) && (
        <p className="m-0 text-xs text-ink-muted">Nothing ticked yet.</p>
      )}
    </div>
  );
}
