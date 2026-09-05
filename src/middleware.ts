import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, so the session cookie stays
     * fresh across the app, but skip images/fonts/manifest for performance.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
