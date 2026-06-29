"use client";

// src/components/LegalLayout.tsx
// Shared layout for all legal pages — trilingual PT/EN/ES

import { useState } from "react";
import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import { sanitizeLegalHtml } from "@/lib/sanitize-html";

interface Section {
  title: { pt: string; en: string; es: string };
  content: { pt: string; en: string; es: string };
}

interface LegalLayoutProps {
  title: { pt: string; en: string; es: string };
  subtitle: { pt: string; en: string; es: string };
  lastUpdated: string;
  sections: Section[];
  badge?: string;
  badgeColor?: string;
}

type Lang = "pt" | "en" | "es";

export default function LegalLayout({
  title, subtitle, lastUpdated, sections, badge, badgeColor = "#176a88",
}: LegalLayoutProps) {
  const [lang, setLang] = useState<Lang>("pt");

  const t = (obj: { pt: string; en: string; es: string }) => obj[lang];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandLogoLink variant="on-dark" size="md" />
          <div className="flex gap-2">
            {(["pt", "en", "es"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-1 rounded-full text-xs font-bold transition"
                style={{
                  background: lang === l ? "#e05930" : "rgba(255,255,255,0.1)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {badge && (
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: badgeColor + "30", color: badgeColor, border: `1px solid ${badgeColor}50` }}
            >
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-bold mb-3">{t(title)}</h1>
          <p className="text-slate-400 text-sm">{t(subtitle)}</p>
          <p className="text-slate-500 text-xs mt-2">
            {lang === "pt" && `Última atualização: ${lastUpdated}`}
            {lang === "en" && `Last updated: ${lastUpdated}`}
            {lang === "es" && `Última actualización: ${lastUpdated}`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {sections.map((section, i) => (
            <div key={i} className="p-8 border-b border-slate-100 last:border-0">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{t(section.title)}</h2>
              <div
                className="text-slate-600 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeLegalHtml(t(section.content)) }}
              />
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500 justify-center">
          <Link href="/privacy" className="hover:text-slate-800">
            {lang === "pt" ? "Política de Privacidade" : lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-slate-800">
            {lang === "pt" ? "Termos de Uso" : lang === "en" ? "Terms of Use" : "Términos de Uso"}
          </Link>
          <span>·</span>
          <Link href="/tcle-telemedicina" className="hover:text-slate-800">
            {lang === "pt" ? "TCLE Telemedicina" : lang === "en" ? "Telemedicine ICF" : "TCLE Telemedicina"}
          </Link>
          <span>·</span>
          <Link href="/acura-voluntariado" className="hover:text-slate-800">
            {lang === "pt" ? "Voluntariado AcuraBrasil" : lang === "en" ? "AcuraBrasil Volunteering" : "Voluntariado AcuraBrasil"}
          </Link>
          <span>·</span>
          <Link href="/hipaa" className="hover:text-slate-800">HIPAA Notice</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-slate-800">
            {lang === "pt" ? "Política de Cookies" : lang === "en" ? "Cookie Policy" : "Política de Cookies"}
          </Link>
        </div>
      </div>
    </div>
  );
}
