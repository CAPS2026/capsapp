"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressPhoto } from "@/lib/compress-photo";
import { createPhotoUploads } from "@/lib/actions/shift-photos";

const BUCKET = "shift-photos";
const MAX = 3;

type Item = { path: string; preview: string };

/** "Add photo" for a health concern or a handover note: up to 3 photos, each
 *  shrunk on the device and uploaded straight to the private bucket. Tells the
 *  parent which paths are ready (`onChange`) and whether an upload is still
 *  going (`busy`), so Save can wait. Photos are only attached once the note is
 *  saved; one removed here is simply left off. */
export function PhotoPicker({ onChange }: { onChange: (paths: string[], busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => {
    onChange(
      items.map((i) => i.path),
      uploading > 0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, uploading]);

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX - items.length - uploading;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (picked.length === 0) {
      setError(`Up to ${MAX} photos.`);
      return;
    }
    setUploading((n) => n + picked.length);
    try {
      const blobs = await Promise.all(picked.map((f) => compressPhoto(f)));
      const r = await createPhotoUploads(blobs.length);
      if (r.error || !r.uploads) throw new Error(r.error ?? "Could not upload the photo.");
      const supabase = createClient();
      const added: Item[] = [];
      for (let i = 0; i < blobs.length; i++) {
        const up = r.uploads[i];
        const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(up.path, up.token, blobs[i], {
          contentType: "image/jpeg",
        });
        if (upErr) throw new Error("The photo did not upload. Check the signal and try again.");
        const preview = URL.createObjectURL(blobs[i]);
        previews.current.push(preview);
        added.push({ path: up.path, preview });
      }
      setItems((cur) => [...cur, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the photo.");
    } finally {
      setUploading((n) => n - picked.length);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {items.map((it) => (
          <div key={it.path} className="relative h-14 w-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.preview} alt="Photo to attach" className="h-14 w-14 rounded-[var(--radius)] object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setItems((cur) => cur.filter((x) => x.path !== it.path))}
              className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#444] text-xs font-bold leading-none text-white"
            >
              x
            </button>
          </div>
        ))}
        {uploading > 0 && <span className="text-xs font-semibold text-ink-muted">Uploading…</span>}
        {items.length + uploading < MAX && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-14 items-center gap-1.5 rounded-[var(--radius)] border-[1.5px] border-dashed border-line-cool px-3.5 text-sm font-bold text-foreground"
          >
            <span aria-hidden="true">📷</span> Add photo
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />
      {error && <p className="m-0 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
