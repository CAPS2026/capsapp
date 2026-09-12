"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PART_LABEL, parseYmd } from "@/lib/shift";
import type { HandoverNoteRow } from "@/lib/shift-data";
import { addHandoverNote } from "@/lib/actions/shift";

function whenLabel(n: HandoverNoteRow) {
  const day = parseYmd(n.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const time = new Date(n.createdAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  return `${PART_LABEL[n.part]} shift, ${day}, ${time}`;
}

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
    <div className="flex flex-1 flex-col gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a note for the next shift…"
          className="h-10 min-w-0 flex-1 rounded-full border border-line-cool bg-card px-4 text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="h-10 shrink-0 rounded-full bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-card p-3">
        {notes.length === 0 ? (
          <p className="text-sm text-ink-muted">No handover notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0">
              <p className="text-xs font-bold text-ink-muted">
                <span className="text-ink">{n.personName}</span> &middot; {whenLabel(n)}
              </p>
              <p className="text-sm leading-relaxed">{n.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
