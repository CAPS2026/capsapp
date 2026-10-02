"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/shift", label: "Checklist" },
  { href: "/shift/roster", label: "Roster" },
  { href: "/shift/handover", label: "Handover log" },
];

/** The mockup's segmented tabs: rounded-top pills sitting on the panel,
 *  the active one taking the panel's own colour so it reads as joined to
 *  it, the others a soft grey. */
export function ShiftTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 bg-background px-4 pt-2.5">
      {TABS.map((t) => {
        const active = t.href === "/shift" ? pathname === "/shift" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-t-[14px] px-3.5 py-2 text-[13px] font-extrabold ${
              active ? "bg-background text-brand-ink" : "bg-gray-tint text-ink-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      {/* One tap over to the dog app, for everyone (Julie, 2 Oct). */}
      <Link
        href="/dogs"
        className="mb-1 ml-auto inline-flex items-center gap-1.5 self-center rounded-full bg-brand px-3.5 py-1.5 text-[13px] font-extrabold text-white"
      >
        Dog app <span aria-hidden="true">&rarr;</span>
      </Link>
    </nav>
  );
}
