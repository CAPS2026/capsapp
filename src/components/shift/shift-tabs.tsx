"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/shift", label: "Checklist" },
  { href: "/shift/roster", label: "Roster" },
  { href: "/shift/handover", label: "Handover" },
];

export function ShiftTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-line bg-paper px-4 pt-2.5">
      {TABS.map((t) => {
        const active = t.href === "/shift" ? pathname === "/shift" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-t-lg px-4 py-2 text-sm font-extrabold ${
              active ? "bg-card text-brand-ink" : "text-ink-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
