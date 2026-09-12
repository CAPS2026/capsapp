// Who's currently "active" on the shared tablet, for the staff app.
//
// This is deliberately separate from Supabase Auth. The tablet stays
// signed in to one real login all day (whatever satisfies is_staff() for
// RLS), that governs whether this device can use the app at all. Which
// of the three caretakers actually did a given tick is a different
// question, answered by this cookie, set when someone taps their name on
// the "who's working right now?" picker. Every action that records who
// did something (signing off a task, claiming one, a handover note)
// reads the acting person from here server-side, never from a client-
// supplied id, the same way src/lib/cafe.ts's CAFE_COOKIE is read rather
// than trusted from the client.

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const SHIFT_PERSON_COOKIE = "caps_shift_person";

/** The active person's id, if the cookie is set. Does not check it's
 *  still a valid/rosterable person, use `getActiveShiftPerson` for that. */
export async function getActiveShiftPersonId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SHIFT_PERSON_COOKIE)?.value ?? null;
}

/** The active person's id + name, re-validated against `people` on every
 *  call (cheap, and means a removed/archived person can't stay "active"). */
export async function getActiveShiftPerson(): Promise<{ id: string; name: string } | null> {
  const id = await getActiveShiftPersonId();
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("id, first_name, surname").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, name: `${data.first_name} ${data.surname}`.trim() };
}

export async function setActiveShiftPerson(personId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SHIFT_PERSON_COOKIE, personId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 16, // well past one shift; a new "who's on" pick overwrites it anyway
  });
}

export async function clearActiveShiftPerson(): Promise<void> {
  const jar = await cookies();
  jar.delete(SHIFT_PERSON_COOKIE);
}
