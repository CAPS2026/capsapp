// Saves a photo sent from a public form (as a small JPEG data URL, already
// shrunk in the browser) onto a person's record. Not a "use server" file:
// it takes a service-role client and is only called from server actions that
// have done their own checks. Never throws — a bad or missing photo must not
// fail a registration.
import { createAdminClient } from "@/lib/supabase/admin";

const PREFIX = "data:image/jpeg;base64,";
/** The browser resizes to ~640px, which is well under this; anything bigger is refused. */
const MAX_BYTES = 700_000;

export async function savePersonPhotoFromDataUrl(
  admin: ReturnType<typeof createAdminClient>,
  personId: string,
  dataUrl: string | undefined,
  opts: { onlyIfBlank: boolean },
): Promise<void> {
  try {
    if (!dataUrl || !dataUrl.startsWith(PREFIX)) return;
    const bytes = Buffer.from(dataUrl.slice(PREFIX.length), "base64");
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return;
    // JPEG files start FF D8 FF.
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return;

    if (opts.onlyIfBlank) {
      const { data } = await admin.from("people").select("photo_path").eq("id", personId).maybeSingle();
      if (data?.photo_path) return;
    }

    const path = `${personId}/photo.jpg`;
    const { error: upErr } = await admin.storage.from("people-photos").upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) {
      console.error("person photo upload failed", upErr);
      return;
    }
    const { error } = await admin
      .from("people")
      .update({ photo_path: path, updated_at: new Date().toISOString() })
      .eq("id", personId);
    if (error) console.error("person photo path update failed", error);
  } catch (e) {
    console.error("person photo save threw", e);
  }
}
