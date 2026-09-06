"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { CurrentPerson } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  staffOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dogs", label: "Dogs" },
  { href: "/site", label: "Site" },
  { href: "/people", label: "People", staffOnly: true },
  { href: "/reports", label: "Reports", staffOnly: true },
];

export function AppShell({
  person,
  children,
}: {
  person: CurrentPerson;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.staffOnly || person.isStaff);

  // Phone-width column, centred — this is a mobile app first; letting it
  // stretch full-bleed on a wide desktop window is what was making rows
  // like "Edit times" look like they had huge wasted gaps (Paul's
  // feedback, 2026-09-07) when really it was just the page being too wide
  // for its own content.
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 h-14">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-full" />
            <span className="font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              CAPS App
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted hidden sm:inline">
              {person.firstName || person.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-semibold text-brand-ink underline underline-offset-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-line bg-card flex justify-center">
        <div className="max-w-lg w-full flex">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-16 text-sm font-semibold ${
                  active ? "text-brand" : "text-ink-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
