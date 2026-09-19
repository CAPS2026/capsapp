"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clock12, firstName, parseYmd } from "@/lib/shift";
import type { HandoverNoteRow } from "@/lib/shift-data";
import { addHandoverNote } from "@/lib/actions/shift";
import { PersonAvatar } from "@/components/shift/person-avatar";

function whenLabel(n: HandoverNoteRow) {
  const day = parseYmd(n.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  return `${n.part === "morning" ? "AM" : "PM"} shift, ${day}, ${clock12(n.createdAt)}`;
}

/** The mockup's handover log: notes newest first in one card, the box to
 *  leave a new one underneath. */
export function HandoverLog({ notes }: { notes: HandoverNoteRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function send() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await addHandoverNote(body);
      if (r.error) setError(r.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-[var(--radius)] border border-line bg-card px-3.5 py-0.5">
        {notes.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">No handover notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="flex flex-col gap-1 border-b border-line py-[11px] last:border-0">
              <div className="flex items-center gap-[7px]">
                <PersonAvatar name={n.personName} size={22} />
                <span className="text-xs font-extrabold text-foreground">{firstName(n.personName)}</span>
                <span className="text-[10.5px] font-semibold text-ink-muted">&middot; {whenLabel(n)}</span>
              </div>
              <p className="m-0 pl-[29px] text-[13px] leading-normal text-foreground">{n.body}</p>
            </div>
          ))
        )}
      </div>

      <form
        className="flex items-center gap-2 rounded-full border border-line bg-card py-[5px] pl-[13px] pr-[5px]"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Leave a note for the next shift…"}
          aria-label="Leave a note for the next shift"
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          aria-label="Send"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
