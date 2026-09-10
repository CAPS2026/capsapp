"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPersonPhoto, removePersonPhoto } from "@/lib/actions/person-photo";

export function PersonPhotoField({
  personId,
  photoUrl,
  initials,
}: {
  personId: string;
  photoUrl: string | null;
  initials: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    startTransition(async () => {
      const res = await uploadPersonPhoto(personId, fd);
      if ("error" in res) setError(res.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removePersonPhoto(personId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
        <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-tint flex items-center justify-center text-xl font-bold text-ink-muted shrink-0">
          {initials}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          disabled={isPending}
          className="text-sm file:mr-2 file:h-9 file:px-3 file:rounded-[var(--radius)] file:border-0 file:bg-brand file:text-white file:font-semibold"
        />
        <div className="flex items-center gap-3 text-sm">
          {isPending && <span className="text-ink-muted">Working…</span>}
          {photoUrl && !isPending && (
            <button type="button" onClick={remove} className="text-danger font-semibold underline underline-offset-2">
              Remove photo
            </button>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
