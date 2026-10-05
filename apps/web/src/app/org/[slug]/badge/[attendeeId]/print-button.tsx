"use client";

export function PrintButton() {
  return (
    <button className="btn-primary mt-4 w-full print:hidden" onClick={() => window.print()}>
      🖨 Print
    </button>
  );
}
