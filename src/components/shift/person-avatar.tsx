import { personColour } from "@/lib/shift";

/** Round coloured initial, the mockup's avatar. Colour is stable per
 *  person (see personColour), so someone looks the same on the sign-in
 *  screen, the sidebar roster, the roster page and the handover log. */
export function PersonAvatar({
  name,
  colourKey,
  size = 24,
  className = "",
}: {
  name: string;
  /** Anything stable for this person (their id is best); falls back to the name. */
  colourKey?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: personColour(colourKey ?? name),
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
