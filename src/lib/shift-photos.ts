import { createAdminClient } from "@/lib/supabase/admin";

/** Server-side helpers for photos on health concerns and handover notes. They
 *  live in the private "shift-photos" bucket; only the server (service role)
 *  can read them, and it hands out short-lived signed links. */

export const PHOTO_BUCKET = "shift-photos";
export const MAX_PHOTOS = 3;

/** Paths the app makes itself: "2026-10/<uuid>.jpg". Anything else is refused,
 *  so a note can never point at some other file in the bucket. */
const PHOTO_PATH_RE = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/i;

export function isPhotoPath(p: string): boolean {
  return PHOTO_PATH_RE.test(p);
}

/** Cleans a list of paths from the screen: valid, no repeats, at most MAX_PHOTOS.
 *  Returns null if anything in it isn't a path the app made. */
export function cleanPhotoPaths(paths: string[] | undefined): string[] | null {
  const list = [...new Set(paths ?? [])];
  if (list.length > MAX_PHOTOS || list.some((p) => !isPhotoPath(p))) return null;
  return list;
}

/** Signed links for these paths, valid for `seconds`. A path that can't be
 *  signed (file missing) is simply left out. */
export async function signPhotoPaths(paths: string[], seconds: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter(isPhotoPath))];
  if (unique.length === 0) return out;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUrls(unique, seconds);
  if (error) {
    console.error("signPhotoPaths failed", error);
    return out;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  }
  return out;
}
