/** Small photos on a health concern or handover note. Tap one to see it full
 *  size (the link is short-lived, made when the page loads). */
export function PhotoThumbs({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer" aria-label="Open photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="Attached photo" className="h-16 w-16 rounded-[var(--radius)] object-cover" />
        </a>
      ))}
    </div>
  );
}
