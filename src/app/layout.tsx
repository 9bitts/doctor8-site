// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SupportWidget from "@/components/SupportWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Doctor8 — Secure Health Platform",
  description: "HIPAA & GDPR compliant telehealth platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <SupportWidget />
      </body>
    </html>
  );
}
