import type { Locale } from "@ev/core";
import { dict } from "@/lib/i18n";

// แถบขั้นตอนการซื้อบัตร: 1 เงื่อนไข · 2 เลือกรอบ · 3 เลือกบัตร · 4 กรอกข้อมูล · 5 ชำระเงิน
export function Steps({ locale, current }: { locale: Locale; current: 1 | 2 | 3 | 4 | 5 }) {
  const labels = dict(locale).steps;
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1 text-xs sm:gap-2 sm:text-sm">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={label} className="flex shrink-0 items-center gap-1 sm:gap-2">
            {i > 0 && <span className={`h-px w-3 sm:w-6 ${n <= current ? "bg-brand" : "bg-line"}`} />}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                state === "todo" ? "border border-line text-muted" : "bg-brand text-brand-ink"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "current" ? "font-semibold" : "hidden text-muted sm:inline"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
