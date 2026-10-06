import type { Metadata } from "next";
import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";
import { LocaleProvider } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOC Expo 2026 · Registration",
  description: "Free registration, name badges and on-site check-in prototype for MOC Expo 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen font-sans antialiased">
        <LocaleProvider>
          <header className="border-b border-line bg-surface print:hidden">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-sm font-bold tracking-wide text-brand">
                EV · Registration
              </Link>
              <LangSwitch />
            </div>
          </header>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
