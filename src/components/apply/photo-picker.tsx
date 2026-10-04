"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 640;

/** Shrink a picked image to a small JPEG data URL (keeps uploads tiny and
 *  fast, and works for photos straight off a phone camera). */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

// Optional photo for an application form: take one with the camera, or pick
// one from the phone/computer. Gives the form a small JPEG data URL, or "".
export function PhotoPicker({
  value,
  onChange,
  label = "Photo (optional)",
  hint = "A clear photo of your face helps us recognise you. You can skip this.",
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  hint?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      onChange(await shrink(file));
    } catch {
      setError("Sorry, we couldn't read that photo. Try another one, or skip this.");
    }
  }

  const btn = "h-10 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm font-semibold";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-bold">{label}</legend>
      <p className="text-xs text-ink">{hint}</p>
      <div className="flex items-center gap-3 flex-wrap">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
          <img src={value} alt="Your photo" className="w-20 h-20 rounded-full object-cover border border-line" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-tint flex items-center justify-center text-ink text-2xl" aria-hidden="true">
            ☺
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={btn} onClick={() => cameraRef.current?.click()}>
              Take a photo
            </button>
            <button type="button" className={btn} onClick={() => libraryRef.current?.click()}>
              Choose a photo
            </button>
            {value && (
              <button type="button" className="h-10 px-3 text-sm font-semibold text-ink underline" onClick={() => onChange("")}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {/* capture="user" asks a phone for the front camera; the other input lets
          people pick an existing photo (or use their device's own camera chooser). */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
