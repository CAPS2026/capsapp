import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303, not the default 307: a 307 makes the browser repeat this POST on the
  // home page, which only serves GET, so signing out landed on an HTTP 405.
  return NextResponse.redirect(new URL("/", request.url), 303);
}
