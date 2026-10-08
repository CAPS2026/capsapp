"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shrinkToJpeg } from "@/lib/image-shrink";
import {
  deleteDogPhoto,
  prepareDogPhotoUploads,
  registerDogPhotos,
  reorderDogPhotos,
  setPhotoSavourLife,
} from "@/lib/actions/dog-photos";

export type ManagedPhoto = { path: string; url: string; slInclude: boolean };

/** SavourLife shows up to 10 photos per dog. */
const SL_LIMIT = 10;

const btn = "h-9 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm font-semibold disabled:opacity-40";

export function PhotoManager({ dogId, dogName, photos }: { dogId: string; dogName: string; photos: ManagedPhoto[] }) {
  const [list, setList] = useState<ManagedPhoto[]>(photos);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const slCount = list.filter((p) => p.slInclude).length;

  async function addFiles(files: FileList | File[] | null) {
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
      // Show them straight away, at the end of the order; the first free SavourLife places are ticked automatically.
      const base = supabase.storage.from("dog-photos");
      setList((l) => {
        let room = Math.max(0, SL_LIMIT - l.filter((p) => p.slInclude).length);
        return [
          ...l,
          ...done.map((p) => ({ path: p, url: base.getPublicUrl(p).data.publicUrl, slInclude: room-- > 0 })),
        ];
      });
      router.refresh();
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
    void reorder([list[i], ...list.filter((_, k) => k !== i)]);
  }

  function dropOn(i: number) {
    const from = dragFrom;
    setDragFrom(null);
    setOverIndex(null);
    if (from === null || from === i) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    void reorder(next);
  }

  async function toggleSl(i: number) {
    setError(null);
    const p = list[i];
    const want = !p.slInclude;
    if (want && slCount >= SL_LIMIT) {
      setError(`SavourLife takes up to ${SL_LIMIT} photos. Untick one first.`);
      return;
    }
    setList((l) => l.map((x, k) => (k === i ? { ...x, slInclude: want } : x)));
    const r = await setPhotoSavourLife(dogId, p.path, want);
    if (!("ok" in r)) {
      setList((l) => l.map((x, k) => (k === i ? { ...x, slInclude: !want } : x)));
      setError(r.error);
    }
  }

  async function remove(i: number) {
    if (!window.confirm(`Delete this photo of ${dogName}? This can't be undone.`)) return;
    setError(null);
    setBusy("Deleting…");
    const r = await deleteDogPhoto(dogId, list[i].path);
    setBusy(null);
    if (!("ok" in r)) return setError(r.error);
    setList((l) => l.filter((_, k) => k !== i));
    setPreview(null);
    router.refresh();
  }

  return (
    <section
      className={`flex flex-col gap-3 border rounded-[var(--radius)] bg-card p-4 ${
        dropActive ? "border-brand bg-brand-tint" : "border-line"
      }`}
      onDragOver={(e) => {
        // Files dragged in from the desktop (not our own thumbnails being reordered).
        if (dragFrom === null && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDropActive(true);
        }
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        if (dragFrom === null && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          setDropActive(false);
          void addFiles(e.dataTransfer.files);
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Photos
          </h2>
          <p className="text-xs text-ink">
            Drop photos here or tap Add photos. Drag a photo to reorder it. Tick <b>SL</b> on the ones for SavourLife (up
            to {SL_LIMIT}): they appear, in this order, on the SavourLife transfer sheet. The first photo is the main one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink">
            {slCount} of {SL_LIMIT} ticked for SavourLife
          </span>
          <button
            type="button"
            className={`${btn} bg-brand text-white border-brand`}
            disabled={!!busy}
            onClick={() => fileRef.current?.click()}
          >
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
        <p className="text-sm text-ink">No photos yet. Drop some here, or tap Add photos and pick as many as you like.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((p, i) => (
            <li
              key={p.path}
              className={`flex flex-col gap-1.5 ${overIndex === i && dragFrom !== null ? "outline outline-2 outline-brand rounded-[var(--radius)]" : ""}`}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragEnd={() => {
                setDragFrom(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                if (dragFrom !== null) {
                  e.preventDefault();
                  setOverIndex(i);
                }
              }}
              onDrop={(e) => {
                if (dragFrom !== null) {
                  e.preventDefault();
                  e.stopPropagation();
                  dropOn(i);
                }
              }}
            >
              <div className="relative aspect-square rounded-[var(--radius)] overflow-hidden bg-gray-tint">
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full"
                  onClick={() => setPreview(i)}
                  aria-label={`Preview photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, shown as-is */}
                  <img src={p.url} alt={`${dogName} photo ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
                </button>
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-brand text-white text-[11px] font-bold">
                    Main
                  </span>
                )}
                {p.slInclude && (
                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-warm text-ink text-[11px] font-extrabold">
                    ✓ SL
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={p.slInclude} onChange={() => void toggleSl(i)} />
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-warm text-ink">SL</span>
                for SavourLife
              </label>
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

      {preview !== null && list[preview] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-3 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-label="Photo preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, shown as-is */}
          <img src={list[preview].url} alt={`${dogName} photo ${preview + 1}`} className="max-h-[80vh] max-w-full rounded-[var(--radius)]" />
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={btn} disabled={preview === 0} onClick={() => setPreview(preview - 1)}>
              ← Previous
            </button>
            <span className="text-white text-sm">
              {preview + 1} of {list.length}
              {list[preview].slInclude ? " · SL" : ""}
            </span>
            <button type="button" className={btn} disabled={preview === list.length - 1} onClick={() => setPreview(preview + 1)}>
              Next →
            </button>
            <button type="button" className={btn} onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
