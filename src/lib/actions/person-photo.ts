"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";

const MAX_BYTES = 6 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Result = { ok: true } | { error: string };

/** Staff-only. Uploads via the service role, so the people-photos bucket
 *  needs no storage RLS policies. One object per person, upserted. */
export async function uploadPersonPhoto(personId: string, formData: FormData): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick an image file." };
  if (file.size > MAX_BYTES) return { error: "That image is over 6 MB — pick a smaller one." };
  if (!OK_TYPES.includes(file.type)) return { error: "Use a JPG, PNG or WebP image." };

  const admin = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${personId}/photo.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await admin.storage
    .from("people-photos")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (up.error) return { error: up.error.message };

  // updated_at bumps via the people trigger → cache-buster changes.
  const { error } = await admin.from("people").update({ photo_path: path }).eq("id", personId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removePersonPhoto(personId: string): Promise<Result> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };

  const admin = createAdminClient();
  const { data } = await admin.from("people").select("photo_path").eq("id", personId).maybeSingle();
  const path = (data?.photo_path as string | null) ?? null;
  if (path) await admin.storage.from("people-photos").remove([path]);
  const { error } = await admin.from("people").update({ photo_path: null }).eq("id", personId);
  if (error) return { error: error.message };
  return { ok: true };
}
