"use client";

import type { Locale, TermsDocument } from "@ev/core";
import { dayLabel, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Modal } from "./modal";

// เงื่อนไขการซื้อบัตรฉบับเต็ม — ถ้าส่ง onAccept มา จะมีปุ่ม "ยอมรับเงื่อนไข" ที่ติ๊กช่องยอมรับให้แล้วปิด
export function TermsModal(props: {
  locale: Locale;
  doc: TermsDocument;
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
}) {
  const { locale, doc } = props;
  const t = dict(locale);
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={tr(doc.title, locale)}
      closeLabel={t.close}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded-xl border border-line px-4 py-2.5 text-sm" onClick={props.onClose}>
            {t.close}
          </button>
          {props.onAccept && (
            <button
              type="button"
              className="btn-primary px-5 py-2.5"
              onClick={() => {
                props.onAccept!();
                props.onClose();
              }}
            >
              {t.acceptTermsButton}
            </button>
          )}
        </div>
      }
    >
      <p className="text-xs text-muted">{t.termsUpdated(dayLabel(doc.updatedAt, locale))}</p>
      <div className="mt-4 space-y-5 text-sm leading-relaxed">
        {doc.sections.map((s) => (
          <section key={s.heading.en}>
            <h3 className="font-semibold">{tr(s.heading, locale)}</h3>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-2 text-muted">
                {tr(p, locale)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  );
}
