"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { CurrentPerson } from "@/lib/auth";
import { CafeBar } from "@/components/cafe/cafe-bar";
import { HandOverButton } from "@/components/cafe/hand-over-button";
import { IdleGuard } from "@/components/cafe/idle-guard";

type NavItem = {
  href: string;
  label: string;
  staffOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dogs", label: "Dogs" },
  { href: "/site", label: "Site" },
  { href: "/people", label: "People", staffOnly: true },
  { href: "/logs", label: "Logs", staffOnly: true },
  { href: "/reports", label: "Reports", staffOnly: true },
];

export function AppShell({
  person,
  pinIsSet,
  children,
}: {
  person: CurrentPerson;
  pinIsSet: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.staffOnly || person.isStaff);

  // Phone-first: the operational screens (Dogs, Site, take-out flows) stay
  // a single ~phone-width column even on a laptop — stretching phone-shaped
  // cards full-bleed is what looked broken (Paul, 2026-09-07). But the
  // staff data screens (People, Logs, Reports) are used on a laptop and
  // genuinely need the width — a wide table shouldn't be crammed into a
  // 512px strip with no room to scroll (Paul, 2026-09-10). So those routes
  // get a wide container.
  // Data tables want the whole laptop; the searchable People list tolerates
  // some width; everything else (card stacks, forms, the phone flows)
  // stays a single readable column.
  const shellWidth =
    pathname.startsWith("/logs") || pathname.startsWith("/reports")
      ? "max-w-6xl"
      : pathname === "/people"
        ? "max-w-3xl"
        : "max-w-lg";

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <IdleGuard />

      <header className="border-b border-line bg-card">
        <div
          className={`${shellWidth} mx-auto flex items-center justify-between gap-2 px-4 h-14`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-full shrink-0" />
            <span
              className="font-extrabold truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              CAPS App
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {person.isStaff && (
              <>
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="text-lg leading-none text-ink-muted"
                >
                  ⚙
                </Link>
                <HandOverButton pinIsSet={pinIsSet} />
              </>
            )}
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

      {person.cafeMode && <CafeBar />}

      <main className={`flex-1 pb-20 ${shellWidth} mx-auto w-full`}>{children}</main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-line bg-card flex justify-center">
        <div className={`${shellWidth} w-full flex`}>
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
