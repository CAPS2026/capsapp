"use server";

import { getCurrentPerson } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PHOTOS, PHOTO_BUCKET } from "@/lib/shift-photos";

type Upload = { path: string; token: string };

/** One-off upload links for `count` photos. The tablet compresses each photo
 *  and sends it straight to the private bucket with its link (so a photo never
 *  passes through the app server, which has a small request size limit). The
 *  paths are made here, never by the screen. */
export async function createPhotoUploads(count: number): Promise<{ error?: string; uploads?: Upload[] }> {
  const person = await getCurrentPerson();
  if (!person?.isStaff && !person?.isAdmin) return { error: "Sign in first." };
  if (!Number.isInteger(count) || count < 1 || count > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos.` };

  const admin = createAdminClient();
  const month = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" }).slice(0, 7);
  const uploads: Upload[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${month}/${crypto.randomUUID()}.jpg`;
    const { data, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: "Could not get ready to upload the photo. Try again." };
    uploads.push({ path, token: data.token });
  }
  return { uploads };
}
