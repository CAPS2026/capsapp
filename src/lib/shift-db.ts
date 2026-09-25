// Which database client the staff app's shared data code uses.
//
// Normally that is the signed-in user's client (the tablet's login), so the
// database's own permission rules apply. The scheduled checks (auto-close,
// shift emails, the "nobody signed in" alert) run with nobody logged in, so
// they run inside runAsService, which hands the same code the service-role
// client instead. Nothing else ever gets the service-role client this way.

import { AsyncLocalStorage } from "node:async_hooks";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Db = Awaited<ReturnType<typeof createClient>>;

const serviceScope = new AsyncLocalStorage<Db>();

/** The client for the current request: the service-role one inside
 *  runAsService, otherwise the signed-in user's. */
export async function shiftDb(): Promise<Db> {
  return serviceScope.getStore() ?? (await createClient());
}

/** Runs `fn` with every shiftDb() call inside it using the service-role
 *  client. Only for the scheduled checks, which have no logged-in user. */
export function runAsService<T>(fn: () => Promise<T>): Promise<T> {
  return serviceScope.run(createAdminClient() as unknown as Db, fn);
}
