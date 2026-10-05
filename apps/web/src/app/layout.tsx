import type { Metadata } from "next";
import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";
import { LocaleProvider } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "EV Tickets",
  description: "Event registration, ticketing and on-site prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen font-sans antialiased">
        <LocaleProvider>
          <header className="border-b border-line bg-surface">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-sm font-bold tracking-wide text-brand">
                EV · Tickets
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
