"use client";

import { useEffect, useRef, useState } from "react";

// ช่องรับการสแกน: เครื่องยิงบาร์โค้ด / เครื่องอ่าน RFID แบบ USB พิมพ์ลงช่องแล้วกด Enter ให้เอง
// หรือเปิดกล้อง (ใช้ BarcodeDetector ของเบราว์เซอร์ ถ้ามี)
type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };

export function ScanInput(props: {
  placeholder: string;
  submitLabel: string;
  cameraLabel: string;
  cameraOffLabel: string;
  cameraUnsupported: string;
  disabled?: boolean;
  onScan: (code: string) => void;
}) {
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(props.onScan);
  onScanRef.current = props.onScan;

  useEffect(() => {
    if (!props.disabled) inputRef.current?.focus();
  }, [props.disabled]);

  useEffect(() => {
    if (!camera) return;
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setCamError(props.cameraUnsupported);
      setCamera(false);
      return;
    }
    const detector = new Ctor({ formats: ["qr_code"] });
    let stream: MediaStream | null = null;
    let stopped = false;
    let last = "";
    let lastAt = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        while (!stopped) {
          const codes = await detector.detect(video).catch(() => []);
          const raw = codes[0]?.rawValue;
          // กันสแกน QR เดิมซ้ำรัวๆ ขณะยังถือไว้หน้ากล้อง
          if (raw && (raw !== last || Date.now() - lastAt > 3000)) {
            last = raw;
            lastAt = Date.now();
            onScanRef.current(raw);
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setCamError(props.cameraUnsupported);
        setCamera(false);
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, props.cameraUnsupported]);

  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap gap-2 sm:flex-nowrap"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          props.onScan(value.trim());
          setValue("");
        }}
      >
        <input
          ref={inputRef}
          aria-label={props.placeholder}
          className="field min-w-0 basis-full py-3 font-mono text-base sm:basis-auto"
          placeholder={props.placeholder}
          value={value}
          disabled={props.disabled}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-primary flex-1 px-5 sm:flex-none" disabled={props.disabled || !value.trim()}>
          {props.submitLabel}
        </button>
        <button
          type="button"
          className="whitespace-nowrap rounded-xl border border-line px-3 text-sm hover:border-brand"
          onClick={() => {
            setCamError(null);
            setCamera((c) => !c);
          }}
        >
          {camera ? props.cameraOffLabel : `📷 ${props.cameraLabel}`}
        </button>
      </form>
      {camera && <video ref={videoRef} className="aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />}
      {camError && <p className="text-xs text-amber-600">{camError}</p>}
    </div>
  );
}
