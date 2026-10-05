"use client";

import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/loading";
import { NotFoundBox } from "@/components/not-found-box";
import { QrSvg } from "@/components/qr-svg";
import { Steps } from "@/components/steps";
import { useBackend } from "@/lib/backend";
import { baht } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { MockPayActions } from "./mock-pay-actions";

// หน้าจำลอง payment gateway (ของจริงจะเป็นหน้าของ Omise / 2C2P ฯลฯ)
export function MockPayView() {
  const { locale } = useLocale();
  const chargeId = useSearchParams().get("charge") ?? "";
  const b = useBackend();
  if (!b) return <Loading />;
  const t = dict(locale);
  const charge = b.payments.getCharge(chargeId);
  if (!charge) return <NotFoundBox />;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4">
        <Steps locale={locale} current={5} />
      </div>
      <p className="rounded-xl bg-amber-100 p-3 text-center text-xs font-semibold text-amber-900">{t.mockBanner}</p>
      <div className="card mt-4 p-6">
        <p className="text-xs text-muted">{t.mockPayTo}</p>
        <p className="font-semibold">EV Demo Organizer Co., Ltd.</p>
        <p className="mt-1 text-xs text-muted">{charge.description}</p>
        <p className="mt-4 text-xs text-muted">{t.mockAmount}</p>
        <p className="text-3xl font-bold">{baht(charge.amountSatang, locale)}</p>

        <div className="mt-6 border-t border-line pt-5">
          {charge.method === "promptpay" && (
            <div className="text-center">
              <p className="text-sm font-medium">{t.mockScan}</p>
              <QrSvg value={`MOCK-PROMPTPAY|${charge.id}|${charge.amountSatang}`} className="mx-auto mt-3 h-48 w-48 rounded-lg p-2" />
            </div>
          )}
          {charge.method === "card" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t.mockCard}</p>
              <input className="field font-mono" readOnly value="4242 4242 4242 4242" />
              <div className="grid grid-cols-2 gap-2">
                <input className="field font-mono" readOnly value="12 / 30" />
                <input className="field font-mono" readOnly value="123" />
              </div>
            </div>
          )}
          {charge.method === "mobile_banking" && (
            <div>
              <p className="text-sm font-medium">{t.mockBank}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {["K PLUS", "SCB EASY", "Krungthai NEXT", "Bualuang mBanking"].map((b) => (
                  <div key={b} className="rounded-lg border border-line p-2 text-center">
                    {b}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <MockPayActions
          chargeId={charge.id}
          status={charge.status}
          returnUrl={charge.returnUrl}
          labels={{ succeed: t.mockSucceed, fail: t.mockFail, done: t.mockAlreadyDone, processing: t.processing }}
        />
      </div>
    </main>
  );
}
