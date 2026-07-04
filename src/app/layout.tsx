// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Poppins } from "next/font/google";
import "./globals.css";
import SupportWidget from "@/components/SupportWidget";
import PwaRegister from "@/components/PwaRegister";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { normalizeLang } from "@/lib/i18n/translations";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Doctor8 — Secure Health Platform",
  description: "HIPAA & GDPR compliant telehealth platform",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#176a88",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  const htmlLang = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";

  return (
    <html lang={htmlLang}>
      <body className={`${poppins.className} antialiased overflow-x-hidden`}>
        <I18nProvider initialLang={lang}>
          <AuthSessionProvider>
            {children}
          </AuthSessionProvider>
          <GoogleAnalytics />
          <SupportWidget />
          <PwaRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
