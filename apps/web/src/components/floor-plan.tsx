import type { Booth, Catalog, Locale, ProductCategory, Sponsor } from "@ev/core";
import { tr } from "@/lib/format";
import { dict } from "@/lib/i18n";

// ผังงาน: โซนสินค้าระบายสีตามหมวด + ตัวอักษรหมวดและชื่อสั้นกำกับทุกโซน (สีไม่ได้สื่อความหมายเพียงอย่างเดียว)
// variant "auto" = ตามโหมดสว่าง/มืดของเครื่อง, "print" = สีสำหรับพื้นขาวเสมอ (ป้ายชื่อที่พิมพ์)
export function FloorPlan({
  catalog,
  locale,
  variant = "auto",
  className,
}: {
  catalog: Catalog;
  locale: Locale;
  variant?: "auto" | "print";
  className?: string;
}) {
  const plan = catalog.floorPlan;
  if (!plan) return null;
  const t = dict(locale);
  const cats = new Map(catalog.categories.map((c) => [c.id, c]));
  const BAND = 18;

  return (
    <svg
      viewBox={`0 0 ${plan.width} ${plan.height}`}
      className={`fp ${variant === "auto" ? "fp-auto" : ""} block h-auto w-full ${className ?? ""}`}
      role="img"
      aria-label={t.floorPlanAria(plan.zones.length)}
    >
      {plan.zones.map((z) => {
        const cat = z.categoryId ? cats.get(z.categoryId) : undefined;
        if (!cat) {
          return (
            <g key={z.id}>
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx={4}
                style={{ fill: "var(--fp-shared)", stroke: "var(--fp-shared-line)" }}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={z.x + z.w / 2}
                y={z.y + z.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={600}
                style={{ fill: "var(--fp-muted)" }}
              >
                {tr(z.label, locale)}
              </text>
            </g>
          );
        }
        const booths = catalog.booths.filter((b) => b.categoryId === cat.id);
        return (
          <g key={z.id} className="fp-cat" style={catVars(cat)}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={4} style={{ fill: "var(--zc)" }} fillOpacity={0.16} />
            <rect
              x={z.x + 0.75}
              y={z.y + 0.75}
              width={z.w - 1.5}
              height={z.h - 1.5}
              rx={3.5}
              fill="none"
              style={{ stroke: "var(--zc)" }}
              strokeWidth={1.5}
            />
            <path
              d={`M${z.x} ${z.y + BAND} V${z.y + 4} a4 4 0 0 1 4 -4 H${z.x + z.w - 4} a4 4 0 0 1 4 4 V${z.y + BAND} Z`}
              style={{ fill: "var(--zc)" }}
            />
            <text x={z.x + 6} y={z.y + BAND / 2} dominantBaseline="central" fontSize={9} fontWeight={700} style={{ fill: "var(--zt)" }}>
              {cat.code} · {tr(cat.shortName, locale)}
            </text>
            {booths.map((b, i) => {
              const perRow = Math.max(1, Math.floor((z.w - 8) / 30));
              const bx = z.x + 6 + (i % perRow) * 30;
              const by = z.y + BAND + 8 + Math.floor(i / perRow) * 22;
              return (
                <g key={b.id}>
                  <rect
                    x={bx}
                    y={by}
                    width={26}
                    height={17}
                    rx={2}
                    style={{ fill: "var(--fp-cell)", stroke: "var(--zc)" }}
                    strokeWidth={1}
                  />
                  <text
                    x={bx + 13}
                    y={by + 8.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8}
                    fontWeight={600}
                    style={{ fill: "var(--fp-ink)" }}
                  >
                    {b.code}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      {plan.entrances.map((e) => (
        <g key={e.id}>
          <path d={`M${e.x} ${e.y - 5} l5 8 h-10 Z`} style={{ fill: "var(--fp-ink)" }} />
          <text x={e.x + 8} y={e.y} dominantBaseline="central" fontSize={8.5} fontWeight={600} style={{ fill: "var(--fp-ink)" }}>
            {tr(e.label, locale)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// คำอธิบายสัญลักษณ์: สี + ตัวอักษรหมวด + ชื่อเต็ม + รหัสบูธ (และชื่อผู้ออกบูธ ถ้าต้องการ)
export function FloorPlanLegend({
  catalog,
  locale,
  variant = "auto",
  showExhibitors = false,
  compact = false,
}: {
  catalog: Catalog;
  locale: Locale;
  variant?: "auto" | "print";
  showExhibitors?: boolean;
  compact?: boolean;
}) {
  const sponsors = new Map(catalog.sponsors.map((s) => [s.id, s]));
  return (
    <ul
      className={`fp ${variant === "auto" ? "fp-auto" : ""} grid ${compact ? "grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-tight" : "gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"}`}
    >
      {catalog.categories.map((cat) => {
        const booths = catalog.booths.filter((b) => b.categoryId === cat.id);
        return (
          <li key={cat.id} className="fp-cat flex items-start gap-2" style={catVars(cat)}>
            <span
              aria-hidden
              className={`mt-0.5 flex shrink-0 items-center justify-center rounded font-bold ${compact ? "h-3.5 w-3.5 text-[9px]" : "h-6 w-6 text-xs"}`}
              style={{ background: "var(--zc)", color: "var(--zt)" }}
            >
              {cat.code}
            </span>
            <span className="min-w-0">
              <span className="font-semibold">{tr(cat.name, locale)}</span>
              {!compact && booths.length > 0 && (
                <span className="block text-xs text-muted">
                  {showExhibitors ? exhibitorList(booths, sponsors) : booths.map((b) => b.code).join(", ")}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function exhibitorList(booths: Booth[], sponsors: Map<string, Sponsor>) {
  return booths.map((b) => `${b.code} ${sponsors.get(b.sponsorId)?.name ?? ""}`.trim()).join(" · ");
}

// ตัวแปร CSS ต่อหมวด: --c/--cd = สีโซน (สว่าง/มืด), --t/--td = สีตัวอักษรบนแถบสีที่ contrast สูงกว่า
function catVars(cat: ProductCategory): React.CSSProperties {
  return {
    "--c": cat.color,
    "--cd": cat.colorDark,
    "--t": textOn(cat.color),
    "--td": textOn(cat.colorDark),
  } as React.CSSProperties;
}

function textOn(hex: string): string {
  const lum = luminance(hex);
  const vsWhite = 1.05 / (lum + 0.05);
  const vsBlack = (lum + 0.05) / 0.05;
  return vsWhite >= vsBlack ? "#ffffff" : "#0b0b0b";
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
