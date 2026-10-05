"use client";

import { useMemo, useState } from "react";
import { HELP_ARTICLES, canSee, searchArticles, type HelpArticle } from "@/lib/help-content";

const TOPIC_ORDER: HelpArticle["topic"][] = [
  "Walks & dogs",
  "Visitors & sign-in",
  "Registering",
  "Out of the kennel",
  "People",
  "Records & reports",
  "Modes & access",
];

function Article({ a, open }: { a: HelpArticle; open: boolean }) {
  return (
    <details open={open} className="border border-line rounded-[var(--radius)] bg-card group">
      <summary className="cursor-pointer list-none px-3 py-3 flex items-center justify-between gap-3 font-semibold">
        <span>{a.title}</span>
        <span aria-hidden="true" className="text-ink transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-3 pb-3 flex flex-col gap-2 text-sm text-ink">
        {a.intro && <p className="font-semibold">{a.intro}</p>}
        <ol className="list-decimal pl-5 flex flex-col gap-1.5">
          {a.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}

// The Help tab: ask a question in the box, or browse by topic. Which how-tos
// show depends on who's looking (a volunteer doesn't see the staff ones).
export function HelpSearch({ viewer }: { viewer: { isStaff: boolean; canKiosk: boolean; isAdmin: boolean } }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => HELP_ARTICLES.filter((a) => canSee(a, viewer)), [viewer]);
  const results = useMemo(() => searchArticles(visible, query), [visible, query]);
  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="help-q" className="text-sm font-semibold">
          How do I…?
        </label>
        <input
          id="help-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a question, e.g. start a walk, register, fix a time"
          className="h-12 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base"
        />
      </div>

      {searching ? (
        results.length === 0 ? (
          <p className="text-sm text-ink">
            Nothing found for &ldquo;{query}&rdquo;. Try fewer or different words, or ask a staff member.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-ink">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            {results.map((a, i) => (
              <Article key={a.id} a={a} open={i === 0} />
            ))}
          </div>
        )
      ) : (
        TOPIC_ORDER.map((topic) => {
          const items = visible.filter((a) => a.topic === topic);
          if (items.length === 0) return null;
          return (
            <section key={topic} className="flex flex-col gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{topic}</h2>
              {items.map((a) => (
                <Article key={a.id} a={a} open={false} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
