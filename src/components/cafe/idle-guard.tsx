"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { enterCafeMode } from "@/lib/actions/cafe";
import { UNLOCK_COOKIE, UNLOCK_IDLE_MS } from "@/lib/cafe";

function readUnlockUntil(): number | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${UNLOCK_COOKIE}=([^;]+)`));
  if (!m) return null;
  const n = Number(decodeURIComponent(m[1]));
  return Number.isFinite(n) ? n : null;
}

// Re-locks a PIN-unlocked shared device: back to café mode after
// UNLOCK_IDLE_MS with no interaction, or immediately if the hard ceiling
// in the unlock cookie has already passed. Does nothing on a fresh staff
// sign-in (no unlock cookie), so a staff member who just logged in is
// never kicked out mid-task.
export function IdleGuard() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlockUntil = readUnlockUntil();
    if (unlockUntil === null) return; // not in a post-PIN window

    let done = false;
    const relock = () => {
      if (done) return;
      done = true;
      if (timer.current) clearTimeout(timer.current);
      enterCafeMode().then(() => router.refresh());
    };

    if (Date.now() >= unlockUntil) {
      relock();
      return;
    }

    const bump = () => {
      if (done) return;
      if (timer.current) clearTimeout(timer.current);
      const cap = readUnlockUntil() ?? 0;
      const wait = Math.min(UNLOCK_IDLE_MS, Math.max(0, cap - Date.now()));
      timer.current = setTimeout(relock, wait);
    };

    const events = ["pointerdown", "keydown", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();

    return () => {
      done = true;
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [router]);

  return null;
}
