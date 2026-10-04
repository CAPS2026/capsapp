"use client";

// A plain date input plus explicit hour/minute selects, replacing the
// browser's native <input type="datetime-local">. Paul hit real problems
// with that (2026-09-06): it follows the OS locale for 12/24-hour display
// instead of always showing 24-hour, and on at least one browser it felt
// like the dialog "auto-submitted" the moment a value was picked — the
// native widget has no explicit confirm step, it just commits on blur.
// This has no implicit-commit behaviour at all; the surrounding dialog's
// own Save button is the only way to actually submit.
//
// Fixed 2026-10-04: picking or typing a date did nothing until the hour AND
// minute had also been chosen — the field reported "" for any partial
// value, and since it's controlled, the date input snapped straight back to
// blank. Now choosing a date fills in the current time (and choosing a time
// fills in today's date), so a value always exists the moment anything is
// picked, and the person just adjusts from there.

const pad = (n: number) => String(n).padStart(2, "0");

/** Local "YYYY-MM-DD" for a Date (not UTC — toISOString would be a day off overnight). */
function localYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
    // The date was cleared: nothing sensible left to report.
    if (next.date === "") return onChange("");
    const now = new Date();
    const d = next.date ?? (datePart || localYmd(now));
    let h = next.hour ?? hour;
    let m = next.minute ?? minute;
    if (h === "" && m === "") {
      h = pad(now.getHours());
      m = pad(now.getMinutes());
    } else {
      if (h === "") h = pad(now.getHours());
      if (m === "") m = "00";
    }
    onChange(`${d}T${h}:${m}`);
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
        {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
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
        {Array.from({ length: 60 }, (_, i) => pad(i)).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "Number of days from today" shortcut for a DateTimeField — keeps whatever
 *  time is already picked (or uses the current time) and moves the date. */
export function DaysAheadSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value=""
      aria-label="Number of days from today"
      onChange={(e) => {
        const days = Number(e.target.value);
        if (!days) return;
        const target = new Date();
        target.setDate(target.getDate() + days);
        const time = value.includes("T") ? value.split("T")[1] : `${pad(target.getHours())}:${pad(target.getMinutes())}`;
        onChange(`${localYmd(target)}T${time}`);
      }}
      className="h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm"
    >
      <option value="">Or pick a number of days…</option>
      {[1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 28].map((n) => (
        <option key={n} value={n}>
          {n} {n === 1 ? "day" : "days"} from now
        </option>
      ))}
    </select>
  );
}

/** Hour + minute only ("14:00"), as "HH:MM". Same fill-in-the-blank rule. */
export function TimeOfDayField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hour = "", minute = ""] = value ? value.split(":") : [];
  function update(next: { hour?: string; minute?: string }) {
    const h = next.hour ?? hour;
    const m = next.minute ?? minute;
    onChange(`${h === "" ? pad(new Date().getHours()) : h}:${m === "" ? "00" : m}`);
  }
  return (
    <div className="flex gap-2 items-center">
      <select
        value={hour}
        onChange={(e) => update({ hour: e.target.value })}
        aria-label="Hour"
        className="h-11 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
      >
        <option value="" disabled>
          HH
        </option>
        {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-ink-muted">:</span>
      <select
        value={minute}
        onChange={(e) => update({ minute: e.target.value })}
        aria-label="Minute"
        className="h-11 px-2 rounded-[var(--radius)] border border-line-cool bg-white"
      >
        <option value="" disabled>
          MM
        </option>
        {Array.from({ length: 12 }, (_, i) => pad(i * 5)).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
