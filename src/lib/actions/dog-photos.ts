"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPerson } from "@/lib/auth";

// Dog photos live in the public `dog-photos` bucket and are listed in `dog_media`
// (path, sort_order, is_primary). The first photo in order is always the main one,
// because SavourLife uses the first image as the featured picture.
//
// Uploads go straight from the browser to storage with one-time signed links, so a
// big photo never has to pass through a server action (which caps request size).

const BUCKET = "dog-photos";
const MAX_PER_BATCH = 20;

type Fail = { error: string };

async function staffOrFail(): Promise<{ ok: true } | Fail> {
  const me = await getCurrentPerson();
  if (!me?.isStaff) return { error: "Staff only." };
  return { ok: true };
}

/** Step 1: one-time upload links for `count` new photos. */
export async function prepareDogPhotoUploads(
  dogId: string,
  count: number,
): Promise<Fail | { ok: true; uploads: { path: string; token: string }[] }> {
  const auth = await staffOrFail();
  if ("error" in auth) return auth;
  if (!Number.isInteger(count) || count < 1 || count > MAX_PER_BATCH)
    return { error: `Choose between 1 and ${MAX_PER_BATCH} photos at a time.` };

  const admin = createAdminClient();
  const uploads: { path: string; token: string }[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${dogId}/${randomUUID()}.jpg`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Couldn't start the upload." };
    uploads.push({ path, token: data.token });
  }
  return { ok: true, uploads };
}

/** Step 2: after the browser has uploaded the files, add them to the dog (at the end of the order). */
export async function registerDogPhotos(dogId: string, paths: string[]): Promise<Fail | { ok: true }> {
  const auth = await staffOrFail();
  if ("error" in auth) return auth;
  if (paths.length === 0 || paths.some((p) => !p.startsWith(`${dogId}/`) || p.includes("..")))
    return { error: "Those photos don't belong to this dog." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("dog_media")
    .select("sort_order, is_primary")
    .eq("dog_id", dogId)
    .order("sort_order", { ascending: false });
  const next = (existing?.[0]?.sort_order ?? -1) + 1;
  const hasPrimary = (existing ?? []).some((m) => m.is_primary);

  const rows = paths.map((path, i) => ({
    dog_id: dogId,
    path,
    sort_order: next + i,
    is_primary: !hasPrimary && i === 0,
  }));
  const { error } = await supabase.from("dog_media").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/dogs/${dogId}`);
  revalidatePath(`/dogs/${dogId}/edit`);
  revalidatePath("/dogs");
  return { ok: true };
}

/** Put the photos in this order. The first becomes the main photo. */
export async function reorderDogPhotos(dogId: string, orderedPaths: string[]): Promise<Fail | { ok: true }> {
  const auth = await staffOrFail();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("dog_media").select("path").eq("dog_id", dogId);
  const have = new Set((existing ?? []).map((m) => m.path as string));
  if (orderedPaths.length !== have.size || orderedPaths.some((p) => !have.has(p)))
    return { error: "The photo list changed — reload the page and try again." };

  // One primary per dog is enforced by a unique index, so clear it before setting the new one.
  const cleared = await supabase.from("dog_media").update({ is_primary: false }).eq("dog_id", dogId);
  if (cleared.error) return { error: cleared.error.message };
  for (let i = 0; i < orderedPaths.length; i++) {
    const { error } = await supabase
      .from("dog_media")
      .update({ sort_order: i, is_primary: i === 0 })
      .eq("dog_id", dogId)
      .eq("path", orderedPaths[i]);
    if (error) return { error: error.message };
  }

  revalidatePath(`/dogs/${dogId}`);
  revalidatePath(`/dogs/${dogId}/edit`);
  revalidatePath("/dogs");
  return { ok: true };
}

/** Remove a photo (and its file). If it was the main one, the next photo takes over. */
export async function deleteDogPhoto(dogId: string, path: string): Promise<Fail | { ok: true }> {
  const auth = await staffOrFail();
  if ("error" in auth) return auth;
  if (!path.startsWith(`${dogId}/`)) return { error: "That photo doesn't belong to this dog." };

  const supabase = await createClient();
  const { error } = await supabase.from("dog_media").delete().eq("dog_id", dogId).eq("path", path);
  if (error) return { error: error.message };
  await createAdminClient().storage.from(BUCKET).remove([path]);

  const { data: rest } = await supabase
    .from("dog_media")
    .select("path")
    .eq("dog_id", dogId)
    .order("sort_order");
  if (rest && rest.length > 0) {
    await supabase.from("dog_media").update({ is_primary: false }).eq("dog_id", dogId);
    for (let i = 0; i < rest.length; i++) {
      await supabase
        .from("dog_media")
        .update({ sort_order: i, is_primary: i === 0 })
        .eq("dog_id", dogId)
        .eq("path", rest[i].path as string);
    }
  }

  revalidatePath(`/dogs/${dogId}`);
  revalidatePath(`/dogs/${dogId}/edit`);
  revalidatePath("/dogs");
  return { ok: true };
}
