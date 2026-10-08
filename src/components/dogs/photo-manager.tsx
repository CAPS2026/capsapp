"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shrinkToJpeg } from "@/lib/image-shrink";
import { deleteDogPhoto, prepareDogPhotoUploads, registerDogPhotos, reorderDogPhotos } from "@/lib/actions/dog-photos";

export type ManagedPhoto = { path: string; url: string };

/** SavourLife shows up to 10 photos per dog. */
const SL_LIMIT = 10;

const btn = "h-9 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm font-semibold disabled:opacity-40";

export function PhotoManager({ dogId, dogName, photos }: { dogId: string; dogName: string; photos: ManagedPhoto[] }) {
  const [list, setList] = useState<ManagedPhoto[]>(photos);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function addFiles(files: FileList | null) {
    setError(null);
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    try {
      setBusy(`Preparing ${picked.length} photo${picked.length === 1 ? "" : "s"}…`);
      const prep = await prepareDogPhotoUploads(dogId, picked.length);
      if (!("ok" in prep)) throw new Error(prep.error);

      const supabase = createClient();
      const done: string[] = [];
      for (let i = 0; i < picked.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${picked.length}…`);
        const blob = await shrinkToJpeg(picked[i]);
        const { path, token } = prep.uploads[i];
        const { error: upErr } = await supabase.storage.from("dog-photos").uploadToSignedUrl(path, token, blob, {
          contentType: "image/jpeg",
        });
        if (upErr) throw new Error(upErr.message);
        done.push(path);
      }
      setBusy("Saving…");
      const reg = await registerDogPhotos(dogId, done);
      if (!("ok" in reg)) throw new Error(reg.error);
      router.refresh();
      // Show them straight away, at the end of the order.
      const base = supabase.storage.from("dog-photos");
      setList((l) => [...l, ...done.map((p) => ({ path: p, url: base.getPublicUrl(p).data.publicUrl }))]);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `Couldn't add the photos: ${e.message}`
          : "Couldn't add the photos. HEIC files from some phones need to be saved as JPEG first.",
      );
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function reorder(next: ManagedPhoto[]) {
    setError(null);
    const before = list;
    setList(next); // show the new order straight away
    const r = await reorderDogPhotos(
      dogId,
      next.map((p) => p.path),
    );
    if (!("ok" in r)) {
      setList(before);
      setError(r.error);
    } else router.refresh();
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    void reorder(next);
  }

  function makeMain(i: number) {
    const next = [list[i], ...list.filter((_, k) => k !== i)];
    void reorder(next);
  }

  async function remove(i: number) {
    if (!window.confirm(`Delete this photo of ${dogName}? This can't be undone.`)) return;
    setError(null);
    setBusy("Deleting…");
    const r = await deleteDogPhoto(dogId, list[i].path);
    setBusy(null);
    if (!("ok" in r)) return setError(r.error);
    setList((l) => l.filter((_, k) => k !== i));
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 border border-line rounded-[var(--radius)] bg-card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Photos
          </h2>
          <p className="text-xs text-ink">
            The first photo is the main one (and SavourLife&apos;s featured image — a clear face works best). SavourLife
            shows the first {SL_LIMIT}; you can keep more here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink">
            {Math.min(list.length, SL_LIMIT)} of {SL_LIMIT} used on SavourLife
          </span>
          <button type="button" className={`${btn} bg-brand text-white border-brand`} disabled={!!busy} onClick={() => fileRef.current?.click()}>
            Add photos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void addFiles(e.target.files)}
          />
        </div>
      </div>

      {busy && <p className="text-sm text-ink">{busy}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {list.length === 0 ? (
        <p className="text-sm text-ink">No photos yet. Tap Add photos and pick as many as you like.</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {list.map((p, i) => (
            <li key={p.path} className="flex flex-col gap-1.5">
              <div className="relative aspect-square rounded-[var(--radius)] overflow-hidden bg-gray-tint">
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, shown as-is */}
                <img src={p.url} alt={`${dogName} photo ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-brand text-white text-[11px] font-bold">
                    Main
                  </span>
                )}
                {i >= SL_LIMIT && (
                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-ink text-white text-[11px] font-bold">
                    Not on SL
                  </span>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                <button type="button" className={btn} disabled={!!busy || i === 0} onClick={() => move(i, -1)} aria-label="Move earlier">
                  ←
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={!!busy || i === list.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move later"
                >
                  →
                </button>
                {i !== 0 && (
                  <button type="button" className={btn} disabled={!!busy} onClick={() => makeMain(i)}>
                    Make main
                  </button>
                )}
                <button type="button" className={`${btn} text-danger`} disabled={!!busy} onClick={() => void remove(i)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
