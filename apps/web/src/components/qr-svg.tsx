"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

// วาด QR เป็น SVG ในเบราว์เซอร์ (ค่าที่ใส่มาจากระบบเอง ไม่ใช่ input ของผู้ใช้)
export function QrSvg({ value, className }: { value: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [value]);
  return <div className={`bg-white ${className ?? ""}`} role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />;
}
