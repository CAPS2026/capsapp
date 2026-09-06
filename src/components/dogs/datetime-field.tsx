"use client";

// A plain date input plus explicit hour/minute selects, replacing the
// browser's native <input type="datetime-local">. Paul hit real problems
// with that (2026-09-06): it follows the OS locale for 12/24-hour display
// instead of always showing 24-hour, and on at least one browser it felt
// like the dialog "auto-submitted" the moment a value was picked — the
// native widget has no explicit confirm step, it just commits on blur.
// This has no implicit-commit behaviour at all; the surrounding dialog's
// own Save button is the only way to actually submit.
export function DateTimeField({
  value,
  onChange,
  required,
}: {
  /** "YYYY-MM-DDTHH:mm" — same shape a native datetime-local input uses. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [datePart = "", timePart = ""] = value ? value.split("T") : [];
  const [hour = "", minute = ""] = timePart ? timePart.split(":") : [];

  function update(next: { date?: string; hour?: string; minute?: string }) {
    const d = next.date ?? datePart;
    const h = next.hour ?? hour;
    const m = next.minute ?? minute;
    onChange(d && h !== "" && m !== "" ? `${d}T${h}:${m}` : "");
  }

  return (
    <div className="flex gap-2">
      <input
        type="date"
        required={required}
        value={datePart}
        onChange={(e) => update({ date: e.target.value })}
        className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white flex-1 min-w-0"
      />
      <select
        required={required}
        value={hour}
        onChange={(e) => update({ hour: e.target.value })}
        aria-label="Hour"
        className="h-11 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
      >
        <option value="" disabled>
          HH
        </option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="self-center text-ink-muted">:</span>
      <select
        required={required}
        value={minute}
        onChange={(e) => update({ minute: e.target.value })}
        aria-label="Minute"
        className="h-11 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
      >
        <option value="" disabled>
          MM
        </option>
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
