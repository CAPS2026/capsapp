"use client";

// STAFF MODE | VOLUNTEER MODE as one two-sided toggle. The side you are on is blue and bold, the
// other grey, so it is obvious which mode the device is in (Paul, 11 Oct). Tapping the grey side
// asks to switch (confirm for volunteer mode, PIN for staff mode).
export function ModeToggle({ mode, onSwitch }: { mode: "staff" | "volunteer"; onSwitch: () => void }) {
  const side = (which: "staff" | "volunteer", label: string) => {
    const active = mode === which;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={active ? undefined : onSwitch}
        className={`h-8 px-3 rounded-full text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap ${
          active ? "bg-white text-brand-ink font-extrabold shadow-sm cursor-default" : "text-ink-muted font-semibold"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div role="group" aria-label="Mode" className="inline-flex items-center rounded-full border border-line bg-gray-tint p-0.5">
      {side("staff", "Staff mode")}
      {side("volunteer", "Volunteer mode")}
    </div>
  );
}
