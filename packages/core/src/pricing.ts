// คำนวณยอดเงินของ order: ส่วนลด, ค่าธรรมเนียม, VAT (ราคารวม VAT แล้ว)
import type { FeeMode, PaymentMethod, PromoCode } from "./types";

export interface PricingLine {
  id: string;
  kind: "ticket" | "addon";
  ticketTypeId: string | null;
  unitPriceSatang: number;
  quantity: number;
}

export interface PricedLine extends PricingLine {
  lineTotalSatang: number;
  discountSatang: number;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotalSatang: number;
  discountSatang: number;
  feeSatang: number; // ค่าธรรมเนียมที่ผู้ซื้อจ่ายเพิ่ม (fee_mode = pass_on)
  totalSatang: number;
  vatSatang: number; // VAT ที่รวมอยู่ใน total
  platformFeeSatang: number; // ค่าธรรมเนียมแพลตฟอร์มที่หักจาก organizer
  gatewayFeeSatang: number;
}

// ค่าธรรมเนียม gateway โดยประมาณ (ใช้กับ mock เท่านั้น ต้องแทนด้วยอัตราจริงจากสัญญา)
export const GATEWAY_FEE_BPS: Record<PaymentMethod, number> = {
  card: 365,
  promptpay: 165,
  mobile_banking: 165,
};

export function isPromoEligible(promo: PromoCode, line: PricingLine): boolean {
  if (line.kind !== "ticket" || line.ticketTypeId === null) return false;
  return promo.ticketTypeIds === null || promo.ticketTypeIds.includes(line.ticketTypeId);
}

export function priceOrder(input: {
  lines: PricingLine[];
  promo: PromoCode | null;
  feeMode: FeeMode;
  platformFeeBps: number;
  vatRateBps: number;
  method: PaymentMethod | null;
}): PricingResult {
  const lines: PricedLine[] = input.lines.map((l) => ({
    ...l,
    lineTotalSatang: l.unitPriceSatang * l.quantity,
    discountSatang: 0,
  }));
  const subtotal = sum(lines.map((l) => l.lineTotalSatang));

  const promo = input.promo;
  if (promo && promo.discountValue > 0) {
    const eligible = lines.filter((l) => isPromoEligible(promo, l) && l.lineTotalSatang > 0);
    if (promo.discountType === "percent") {
      for (const l of eligible) {
        l.discountSatang = Math.floor((l.lineTotalSatang * promo.discountValue) / 100);
      }
    } else {
      // ลดเป็นจำนวนเงินต่อ order: ไล่หักทีละบรรทัดจนครบ (ไม่เกินยอดของบรรทัดที่ลดได้)
      let remaining = promo.discountValue;
      for (const l of eligible) {
        const d = Math.min(remaining, l.lineTotalSatang);
        l.discountSatang = d;
        remaining -= d;
        if (remaining === 0) break;
      }
    }
  }

  const discount = sum(lines.map((l) => l.discountSatang));
  const afterDiscount = subtotal - discount;
  const platformFee = Math.round((afterDiscount * input.platformFeeBps) / 10_000);
  const fee = input.feeMode === "pass_on" ? platformFee : 0;
  const total = afterDiscount + fee;
  const vat = Math.round((total * input.vatRateBps) / (10_000 + input.vatRateBps));
  const gatewayFee =
    input.method && total > 0 ? Math.round((total * GATEWAY_FEE_BPS[input.method]) / 10_000) : 0;

  return {
    lines,
    subtotalSatang: subtotal,
    discountSatang: discount,
    feeSatang: fee,
    totalSatang: total,
    vatSatang: vat,
    platformFeeSatang: platformFee,
    gatewayFeeSatang: gatewayFee,
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
