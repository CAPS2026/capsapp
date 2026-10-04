"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 px-4 rounded-[var(--radius)] bg-brand text-white text-sm font-bold"
    >
      Print
    </button>
  );
}
