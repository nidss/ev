// ค่าคงที่ของ static site
export const EVENT_SLUG = "moc-expo-2026";
// GitHub Pages ของ repo อยู่ใต้ /ev — ตั้งตอน build ผ่าน NEXT_PUBLIC_BASE_PATH
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// URL เต็ม (ใช้ใน QR บูธที่ต้องเปิดจากกล้องมือถือ)
export function absoluteUrl(path: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${BASE_PATH}${path}`;
}
