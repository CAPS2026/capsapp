"use client";

import { useState } from "react";
import { zipSync } from "fflate";
import { sheetAsText, sheetMissing, type SheetField } from "@/lib/savourlife-sheet";

export type SheetPhoto = { path: string; url: string };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / blocked clipboard: fall back to a hidden text box.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyButton({ text, label = "Copy", big = false }: { text: string; label?: string; big?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "done" : "failed");
        setTimeout(() => setState("idle"), 1600);
      }}
      className={`shrink-0 rounded-[var(--radius)] border font-bold ${
        big ? "h-11 px-5 text-base" : "h-9 px-4 text-sm"
      } ${state === "done" ? "bg-ok text-white border-ok" : "bg-white border-line-cool text-brand-ink"}`}
    >
      {state === "done" ? "Copied ✓" : state === "failed" ? "Select & copy" : label}
    </button>
  );
}

function safe(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "dog";
}

export function SavourLifeSheet({
  dogName,
  dogRef,
  fields,
  photos,
  savourlifeId,
}: {
  dogName: string;
  dogRef: string;
  fields: SheetField[];
  photos: SheetPhoto[];
  savourlifeId: number | null;
}) {
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const missing = sheetMissing(fields, photos.length);
  const filename = (i: number) => `${String(i + 1).padStart(2, "0")}-${safe(dogName)}${i === 0 ? "-main" : ""}.jpg`;

  async function downloadAll() {
    setZipError(null);
    setZipping(true);
    try {
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < photos.length; i++) {
        const res = await fetch(photos[i].url);
        if (!res.ok) throw new Error(`photo ${i + 1} couldn't be fetched`);
        files[filename(i)] = new Uint8Array(await res.arrayBuffer());
      }
      const zip = zipSync(files, { level: 0 }); // JPEGs are already compressed
      const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safe(dogName)}-savourlife-photos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      setZipError(e instanceof Error ? e.message : "Couldn't build the zip.");
    } finally {
      setZipping(false);
    }
  }

  async function downloadOne(i: number) {
    try {
      const res = await fetch(photos[i].url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename(i);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      setZipError("Couldn't download that photo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink">
          {dogName} · {dogRef}
          {savourlifeId ? ` · SavourLife ID ${savourlifeId}` : " · not on SavourLife yet"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://www.savour-life.com.au/"
            target="_blank"
            rel="noreferrer"
            className="h-11 px-4 inline-flex items-center rounded-[var(--radius)] border border-line-cool text-sm font-semibold text-brand-ink"
          >
            Open SavourLife ↗
          </a>
          <CopyButton big text={sheetAsText(fields)} label="Copy all details" />
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-[var(--radius)] bg-warm-tint border border-warm p-3 text-sm">
          <b>SavourLife needs these before it will list {dogName}:</b> {missing.join(", ")}. Add them with Edit dog.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {fields.map((f, i) => (
          <div key={f.label}>
            {f.group && (
              <h2
                className={`text-sm font-extrabold uppercase tracking-wide text-ink ${i === 0 ? "" : "pt-4"} pb-1`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {f.group}
              </h2>
            )}
            <div className="flex items-start gap-3 rounded-[var(--radius)] border border-line bg-card p-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink">
                  {f.label}
                  {f.required && <span className="text-danger"> *</span>}
                </div>
                <div className={`text-base whitespace-pre-wrap break-words ${f.value ? "" : "text-ink-muted"}`}>
                  {f.value || "— blank —"}
                </div>
              </div>
              <CopyButton text={f.value} />
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink" style={{ fontFamily: "var(--font-display)" }}>
              Photos for SavourLife
            </h2>
            <p className="text-xs text-ink">
              The first is the featured image. On SavourLife press Select Files and choose these, or drag them in. They are
              numbered in the right order.
            </p>
          </div>
          {photos.length > 0 && (
            <button
              type="button"
              disabled={zipping}
              onClick={() => void downloadAll()}
              className="h-11 px-5 rounded-[var(--radius)] bg-brand text-white font-bold disabled:opacity-60"
            >
              {zipping ? "Preparing zip…" : `Download all ${photos.length} (zip)`}
            </button>
          )}
        </div>
        {zipError && <p className="text-sm text-danger">{zipError}</p>}
        {photos.length === 0 ? (
          <p className="text-sm text-ink">
            No photos are ticked for SavourLife yet. Open Edit dog and tick SL on up to 10 photos.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {photos.map((p, i) => (
              <li key={p.path} className="flex flex-col gap-1.5">
                <div className="relative aspect-square rounded-[var(--radius)] overflow-hidden bg-gray-tint">
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, shown as-is */}
                  <img src={p.url} alt={`${dogName} photo ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-warm text-ink text-[11px] font-extrabold">
                    {i === 0 ? "1 · Featured" : i + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadOne(i)}
                  className="h-9 rounded-[var(--radius)] border border-line-cool bg-white text-sm font-semibold"
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
