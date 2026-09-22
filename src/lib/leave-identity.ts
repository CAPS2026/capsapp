// Who is asking for leave on the shared tablet: a separate identity from
// src/lib/shift-identity.ts's "who's on shift" cookie. They must never be
// the same cookie. Someone opening "Ask for leave" to request leave for a
// colleague (or themselves) must not change who the sidebar and checklist
// think is currently on shift; ending that leave pop-up must not touch a
// real shift in progress either. So "Ask for leave" always asks who you
// are, on its own cookie, however that answer compares to who's on shift.

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const LEAVE_PERSON_COOKIE = "caps_leave_person";

/** The person currently answering the leave form, if any, re-validated
 *  against `people` on every call (so a removed/archived person can't
 *  stay picked). Cleared once the pop-up is closed or "Switch person" is
 *  tapped; never read as who's on shift. */
export async function getLeaveIdentity(): Promise<{ id: string; name: string } | null> {
  const jar = await cookies();
  const id = jar.get(LEAVE_PERSON_COOKIE)?.value;
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("id, first_name, surname").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, name: `${data.first_name} ${data.surname}`.trim() };
}

export async function setLeaveIdentity(personId: string): Promise<void> {
  const jar = await cookies();
  jar.set(LEAVE_PERSON_COOKIE, personId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // just long enough for one pop-up session
  });
}

export async function clearLeaveIdentity(): Promise<void> {
  const jar = await cookies();
  jar.delete(LEAVE_PERSON_COOKIE);
}
