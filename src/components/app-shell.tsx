"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { CurrentPerson } from "@/lib/auth";
import { CafeBar } from "@/components/cafe/cafe-bar";
import { HandOverButton } from "@/components/cafe/hand-over-button";
import { IdleGuard } from "@/components/cafe/idle-guard";
import { ClipboardIcon, HelpIcon, LogsIcon, PawIcon, PeopleIcon, ReportsIcon, SignInIcon } from "@/components/nav-icons";

type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  staffOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dogs", label: "Dogs", Icon: PawIcon },
  { href: "/site", label: "Site Visitors", Icon: SignInIcon },
  { href: "/shift", label: "Shift", Icon: ClipboardIcon, staffOnly: true },
  { href: "/people", label: "People", Icon: PeopleIcon, staffOnly: true },
  { href: "/logs", label: "Logs", Icon: LogsIcon, staffOnly: true },
  { href: "/reports", label: "Reports", Icon: ReportsIcon, staffOnly: true },
  { href: "/help", label: "Help", Icon: HelpIcon },
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
          {/* Staff and admins only: one tap over to the staff app, in the same
              place and colours as the "Dog app" button over there. */}
          {person.isStaff && (
            <Link
              href="/shift"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#006AA7] px-5 py-[9px] text-[17px] font-extrabold leading-6 text-[#FECC02]"
            >
              Staff app <span aria-hidden="true">&rarr;</span>
            </Link>
          )}
        </div>
      </header>

      {/* One tidy bar under the header for the signed-in account: the mode
          label and switch on the left/centre, settings and sign out on the
          right. In volunteer mode the CafeBar below takes over the mode part. */}
      <div className="bg-gray-tint border-b border-line">
        <div className={`${shellWidth} mx-auto flex items-center gap-3 px-4 h-11`}>
          {person.isStaff ? (
            <>
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide text-ink-muted">
                Staff Mode
              </span>
              <HandOverButton pinIsSet={pinIsSet} />
            </>
          ) : (
            <span />
          )}
          <div className="ml-auto flex items-center gap-4">
            {person.isAdmin && (
              <Link
                href="/settings"
                aria-label="Settings"
                className="text-lg leading-none text-ink-muted focus:outline-none"
              >
                ⚙
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm font-semibold text-brand-ink underline underline-offset-2">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {person.cafeMode && <CafeBar />}

      <main className={`flex-1 pb-20 ${shellWidth} mx-auto w-full`}>{children}</main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-line bg-card flex justify-center">
        <div className="max-w-lg w-full flex">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-16 px-0.5 text-[11px] leading-tight text-center font-semibold ${
                  active ? "text-brand" : "text-ink-muted"
                }`}
              >
                <item.Icon className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
