"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setCommittee, setVolunteerPlus } from "@/lib/actions/people";

type Held = { role: string; status: string };

// One "Update status" button instead of a separate toggle per role (Paul,
// 2026-10-04). Lists only what this viewer can do from here:
//  - Volunteer + / Committee: admins only, done in place.
//  - Jail break / Foster carer: staff, but these need an application, so they
//    open the homecare form rather than flipping a switch.
// Staff and admin roles are managed in the Staff app, so they're not here.
export function UpdateStatusMenu({
  personId,
  firstName,
  email,
  roles,
  viewerIsAdmin,
}: {
  personId: string;
  firstName: string;
  email: string | null;
  roles: Held[];
  viewerIsAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const has = (role: string, statuses = ["active"]) => roles.some((r) => r.role === role && statuses.includes(r.status));
  const isVolunteer = has("volunteer");
  const isPlus = has("volunteer_plus");
  const isCommittee = has("committee");
  const jbHeld = has("jailbreak_carer", ["active", "pending"]);
  const fosterHeld = has("foster_carer", ["active", "pending"]);

  function run(action: () => Promise<{ error?: string }>, done: string) {
    setOpen(false);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const r = await action();
      if (r.error) setError(r.error);
      else {
        setMessage(done);
        router.refresh();
      }
    });
  }

  const signInNote = `Tell ${firstName} to sign in at capsapp-five.vercel.app/login${email ? ` with ${email}` : ""}.`;

  const items: { key: string; node: React.ReactNode }[] = [];
  const itemClass = "w-full text-left h-11 px-3 text-sm font-semibold hover:bg-gray-tint block leading-[44px]";

  if (viewerIsAdmin && (isVolunteer || isPlus)) {
    items.push({
      key: "plus",
      node: (
        <button
          type="button"
          className={itemClass}
          onClick={() =>
            run(() => setVolunteerPlus(personId, !isPlus), isPlus ? "Volunteer + removed." : `Made Volunteer +. ${signInNote}`)
          }
        >
          {isPlus ? "Remove Volunteer +" : "Make Volunteer +"}
        </button>
      ),
    });
  }
  if (viewerIsAdmin) {
    items.push({
      key: "committee",
      node: (
        <button
          type="button"
          className={itemClass}
          onClick={() =>
            run(() => setCommittee(personId, !isCommittee), isCommittee ? "Committee role removed." : `Made a committee member. ${signInNote}`)
          }
        >
          {isCommittee ? "Remove committee member" : "Make committee member"}
        </button>
      ),
    });
  }
  if (!jbHeld) {
    items.push({
      key: "jb",
      node: (
        <Link href={`/people/${personId}/homecare?program=jail_break`} className={itemClass}>
          Add jail break carer…
        </Link>
      ),
    });
  }
  if (!fosterHeld) {
    items.push({
      key: "foster",
      node: (
        <Link href={`/people/${personId}/homecare?program=foster`} className={itemClass}>
          Add foster carer…
        </Link>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative self-start">
        <button
          type="button"
          disabled={isPending}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white text-sm font-bold disabled:opacity-60"
        >
          {isPending ? "Updating…" : "Update status ▾"}
        </button>
        {open && (
          <div className="absolute z-20 mt-1 min-w-60 rounded-[var(--radius)] border border-line bg-card shadow-lg overflow-hidden">
            {items.map((i) => (
              <div key={i.key}>{i.node}</div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-ink">{message}</p>}
    </div>
  );
}
