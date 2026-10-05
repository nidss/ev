import type { NextConfig } from "next";

// static export สำหรับ GitHub Pages — ทุกหน้าเป็นไฟล์ HTML และทำงานในเบราว์เซอร์ทั้งหมด
// NEXT_PUBLIC_BASE_PATH=/ev ตอน build ขึ้น https://<owner>.github.io/ev/
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
