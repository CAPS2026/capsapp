"use client";

import { OTHER } from "@/lib/home-options";

const inputClass = "h-11 px-3 rounded-[var(--radius)] border border-line-cool bg-white text-base w-full";

type Option = string | [string, string];

function pairs(options: Option[]): [string, string][] {
  return options.map((o): [string, string] => (typeof o === "string" ? [o, o] : o));
}

// A dropdown that keeps any older free-text answer visible as its own option.
export function Pick({
  value,
  onChange,
  options,
  className = inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
}) {
  const list = pairs(options);
  const known = list.some(([v]) => v === value);
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose one…</option>
      {list.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
      {value && !known && <option value={value}>{value}</option>}
    </select>
  );
}

// Dropdown whose last choice is "Other": picking it shows a box to say what.
// The stored value is the typed text (or "Other" until something is typed), so
// the database keeps one readable string.
export function PickOther({
  value,
  onChange,
  options,
  otherLabel = "Please specify",
  className = inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  otherLabel?: string;
  className?: string;
}) {
  const fixed = options.filter((o) => o !== OTHER);
  const isOther = value === OTHER || (value !== "" && !fixed.includes(value));
  return (
    <div className="flex flex-col gap-2">
      <select
        className={className}
        value={isOther ? OTHER : value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose one…</option>
        {fixed.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTHER}>Other</option>
      </select>
      {isOther && (
        <input
          className={className}
          placeholder={otherLabel}
          value={value === OTHER ? "" : value}
          onChange={(e) => onChange(e.target.value || OTHER)}
        />
      )}
    </div>
  );
}
