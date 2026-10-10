"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// One "⋯ Manage" menu for the staff-only actions on a dog, so they stop floating beside the name.
// Exit dog will go here too.
export function ManageMenu({ dogId }: { dogId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "block px-4 py-2.5 text-sm font-semibold hover:bg-gray-tint";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm font-bold"
      >
        ⋯ Manage
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 z-20 rounded-[var(--radius)] border border-line bg-card shadow-lg overflow-hidden"
        >
          <Link role="menuitem" href={`/dogs/${dogId}/edit`} className={item} onClick={() => setOpen(false)}>
            Edit dog and photos
          </Link>
          <Link
            role="menuitem"
            href={`/dogs/${dogId}/savourlife`}
            className={`${item} border-t border-line`}
            onClick={() => setOpen(false)}
          >
            SavourLife details
          </Link>
        </div>
      )}
    </div>
  );
}
