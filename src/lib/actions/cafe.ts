"use server";

import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";
import {
  CAFE_COOKIE,
  UNLOCK_COOKIE,
  UNLOCK_MAX_MS,
  isValidPin,
} from "@/lib/cafe";

const PIN_FAIL_COOKIE = "caps_pin_fail";
const PIN_LOCK_COOKIE = "caps_pin_lock";

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPin(pin: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Read the org PIN hash with the service role (org_settings is staff-read only). */
async function readPinHash(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("org_settings").select("staff_pin_hash").maybeSingle();
  return (data?.staff_pin_hash as string | null) ?? null;
}

export async function staffPinIsSet(): Promise<boolean> {
  return (await readPinHash()) !== null;
}

/** "Hand to volunteers" — drop this device into café mode. No auth needed:
 *  it only ever removes access, and only a staff session sees the button. */
export async function enterCafeMode(): Promise<void> {
  const jar = await cookies();
  jar.set(CAFE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  jar.delete(UNLOCK_COOKIE);
}

/** PIN step-up — leave café mode for full staff access, and arm the
 *  idle-guard so a shared device re-locks itself. */
export async function exitCafeMode(pin: string): Promise<{ ok: true } | { error: string }> {
  if (!isValidPin(pin)) return { error: "Enter the 4–6 digit staff PIN." };

  const stored = await readPinHash();
  if (!stored) {
    return { error: "No staff PIN has been set yet. A staff member can set one in Settings." };
  }

  const jar = await cookies();

  // After 5 wrong tries this device waits 5 minutes. Blunts guessing a short
  // PIN by hand; the fresh-sign-in route back in is unaffected.
  const lockedUntil = Number(jar.get(PIN_LOCK_COOKIE)?.value ?? 0);
  if (lockedUntil > Date.now()) {
    const mins = Math.ceil((lockedUntil - Date.now()) / 60_000);
    return { error: `Too many wrong tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  // A small constant delay slows each guess too.
  await new Promise((r) => setTimeout(r, 400));
  if (!verifyPin(pin, stored)) {
    const fails = Number(jar.get(PIN_FAIL_COOKIE)?.value ?? 0) + 1;
    if (fails >= 5) {
      jar.set(PIN_LOCK_COOKIE, String(Date.now() + 5 * 60_000), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 300 });
      jar.delete(PIN_FAIL_COOKIE);
    } else {
      jar.set(PIN_FAIL_COOKIE, String(fails), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    }
    return { error: "That PIN isn't right." };
  }
  jar.delete(PIN_FAIL_COOKIE);

  jar.delete(CAFE_COOKIE);
  jar.set(UNLOCK_COOKIE, String(Date.now() + UNLOCK_MAX_MS), {
    httpOnly: false, // read by the client idle-guard
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(UNLOCK_MAX_MS / 1000),
  });
  return { ok: true };
}

/** Set, change or reset the shared staff PIN. Admin only (and not reachable from
 *  café mode, since isAdmin is false there — which is the intended guard). */
export async function setStaffPin(newPin: string): Promise<{ ok: true } | { error: string }> {
  const person = await getCurrentPerson();
  if (!person?.isAdmin) return { error: "Admin only." };
  if (!isValidPin(newPin)) return { error: "The new PIN must be 4–6 digits." };

  // No "current PIN" needed: an admin is already signed in with their own
  // login (and isn't in volunteer mode), which is stronger proof than the PIN
  // — so a forgotten PIN is fixed by simply setting a new one.
  // org_settings is a single row (id = true) with a staff-only update
  // policy; the signed-in staff client is allowed to write it.
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_settings")
    .update({ staff_pin_hash: hashPin(newPin) })
    .eq("id", true);
  if (error) return { error: error.message };
  return { ok: true };
}
