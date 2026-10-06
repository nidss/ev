"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

// modal ที่เข้าถึงได้ด้วยคีย์บอร์ด: Esc ปิด, คลิกพื้นหลังปิด, focus วนอยู่ใน modal, คืน focus เมื่อปิด, ล็อกการเลื่อนหน้า
export function Modal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useEffect(() => {
    if (!props.open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus();
    };
  }, [props.open]);

  if (!props.open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      // ใช้ rgba ตรงๆ (ไม่พึ่ง color-mix) ให้เบราว์เซอร์รุ่นเก่าแสดงได้
      style={{ backgroundColor: "rgba(15, 23, 42, 0.6)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-surface shadow-xl sm:max-h-[85vh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold">
            {props.title}
          </h2>
          <button
            type="button"
            data-autofocus
            aria-label={props.closeLabel}
            className="-mr-1 rounded-lg px-2 py-1 text-xl leading-none text-muted hover:bg-bg"
            onClick={props.onClose}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{props.children}</div>
        {props.footer && <div className="border-t border-line px-5 py-3">{props.footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
