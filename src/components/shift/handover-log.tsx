"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockTime, firstName, parseYmd } from "@/lib/shift";
import type { HandoverNoteRow } from "@/lib/shift-data";
import { addHandoverNote, tickHandoverNote } from "@/lib/actions/shift";
import { PersonAvatar } from "@/components/shift/person-avatar";

function whenLabel(n: HandoverNoteRow) {
  const day = parseYmd(n.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  return `${n.part === "morning" ? "Morning" : "Afternoon"} shift, ${day}, ${clockTime(n.createdAt)}`;
}

/** The handover log: notes still to do at the top, each ticked off like a
 *  checklist task (the sidebar's "Check the handover log now" button stays
 *  until they all are), then recent ones already done, struck through. The
 *  box to leave a new note underneath. */
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

  function tick(id: string, done: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await tickHandoverNote(id, done);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="m-0 text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        Handover log
      </h2>
      <div className="rounded-[var(--radius)] border border-line bg-card">
        {notes.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-ink-muted">No handover notes yet.</p>
        ) : (
          notes.map((n) => {
            const done = n.doneAt !== null;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-2.5 border-b border-line px-3.5 py-[11px] last:border-0 ${n.isAuto && !done ? "bg-[#FDECEC]" : ""}`}
              >
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => tick(n.id, !done)}
                  aria-label={done ? "Mark as not done" : "Mark as done"}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 text-xs font-extrabold ${
                    done ? "border-ok bg-ok text-white" : "border-line-cool bg-white"
                  }`}
                >
                  {done ? "✓" : ""}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-[7px]">
                    {n.isAuto ? (
                      <span className="text-xs font-extrabold text-[#9E2A2A]">Automatic</span>
                    ) : (
                      <>
                        <PersonAvatar name={n.personName} size={22} />
                        <span className="text-xs font-extrabold text-foreground">{firstName(n.personName)}</span>
                      </>
                    )}
                    <span className="text-[10.5px] font-semibold text-ink-muted">&middot; {whenLabel(n)}</span>
                  </div>
                  <p className={`m-0 text-[14px] leading-normal ${done ? "text-ink-muted line-through" : "font-semibold text-foreground"}`}>
                    {n.body}
                  </p>
                  {done && n.doneByName && n.doneAt && (
                    <p className="m-0 text-[10.5px] font-semibold text-ok">
                      Done by {n.doneByName}, {clockTime(n.doneAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
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
