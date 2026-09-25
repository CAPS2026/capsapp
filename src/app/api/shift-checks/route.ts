// The staff app's scheduled checks, called every 15 minutes by a database
// timer (Supabase pg_cron, set up outside the code), so auto-close, the
// end-of-shift emails and the "nobody signed in" alert no longer depend on
// someone opening the app.
//
// Nobody is logged in here, so it is locked by a secret: the timer sends it
// in the x-cron-secret header, and it must match the one stored in the
// database table shift_cron_secret (readable only with the service role,
// never by any logged-in user). Anyone calling it without that gets 401.

import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAsService } from "@/lib/shift-db";
import { runScheduledShiftChecks } from "@/lib/shift-email";

export const dynamic = "force-dynamic";

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function handle(request: Request): Promise<Response> {
  const given = request.headers.get("x-cron-secret") ?? "";
  if (!given) return new Response("Unauthorised", { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin.from("shift_cron_secret").select("secret").maybeSingle();
  const expected = (data?.secret as string | undefined) ?? "";
  if (!expected || !same(given, expected)) return new Response("Unauthorised", { status: 401 });

  await runAsService(runScheduledShiftChecks);
  return Response.json({ ok: true, at: new Date().toISOString() });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
