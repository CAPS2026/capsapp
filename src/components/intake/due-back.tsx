"use client";

import { useState } from "react";
import { DateTimeField } from "@/components/dogs/datetime-field";

// "Back in…" choices turn a vague date-and-time control into one tap: pick how long, and the
// exact due-back moment is shown in words underneath. "Pick a date and time" is still there.
const PRESETS: { key: string; label: string; ms: number }[] = [
  { key: "1h", label: "1 hour", ms: 3600e3 },
  { key: "2h", label: "2 hours", ms: 2 * 3600e3 },
  { key: "4h", label: "4 hours", ms: 4 * 3600e3 },
  { key: "1d", label: "1 day", ms: 24 * 3600e3 },
  { key: "2d", label: "2 days", ms: 2 * 24 * 3600e3 },
  { key: "3d", label: "3 days", ms: 3 * 24 * 3600e3 },
  { key: "1w", label: "1 week", ms: 7 * 24 * 3600e3 },
  { key: "2w", label: "2 weeks", ms: 14 * 24 * 3600e3 },
  { key: "4w", label: "4 weeks", ms: 28 * 24 * 3600e3 },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date as the "YYYY-MM-DDTHH:mm" local string the date-time controls use. */
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Mon 12 Oct, 4:19 pm" — the due-back moment in plain words. */
export function dueBackText(value: string): string | null {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

const selectClass = "h-10 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-sm w-full";

export function DueBackPicker({ value, onChange }: { value: string; onChange: (local: string) => void }) {
  const [choice, setChoice] = useState("");
  const words = dueBackText(value);
  return (
    <div className="flex flex-col gap-2">
      <select
        className={selectClass}
        value={choice}
        onChange={(e) => {
          const k = e.target.value;
          setChoice(k);
          const p = PRESETS.find((x) => x.key === k);
          if (p) onChange(toLocalInput(new Date(Date.now() + p.ms)));
          else if (k === "custom" && !value) onChange("");
        }}
      >
        <option value="">Select…</option>
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
        <option value="custom">Pick a date and time…</option>
      </select>
      {choice === "custom" && <DateTimeField required value={value} onChange={onChange} />}
      {words && (
        <p className="text-sm font-semibold text-ink">
          Due back: <span className="text-brand-ink">{words}</span>
        </p>
      )}
    </div>
  );
}
