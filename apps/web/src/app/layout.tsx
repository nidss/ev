import type { Metadata } from "next";
import { LangSwitch } from "@/components/lang-switch";
import { getLocale } from "@/lib/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "EV Tickets",
  description: "Event registration & ticketing prototype",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="text-sm font-bold tracking-wide text-brand">EV · Tickets</span>
            <LangSwitch locale={locale} />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
