"use client";

// src/components/LanguageSwitcher.tsx
// Dropdown to switch the interface language (PT / EN / ES).

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGUAGES } from "@/lib/i18n/translations";

export default function LanguageSwitcher({ variant = "header" }: { variant?: "header" | "sidebar" }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[1];

  const isSidebar = variant === "sidebar";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          isSidebar
            ? "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
        }
        aria-label="Language"
      >
        <Globe size={isSidebar ? 18 : 16} />
        <span className={isSidebar ? "" : "hidden sm:inline"}>{current.flag} {isSidebar ? current.label : current.code.toUpperCase()}</span>
        <ChevronDown size={14} className={isSidebar ? "ml-auto" : ""} />
      </button>

      {open && (
        <div
          className={
            isSidebar
              ? "absolute bottom-full left-0 mb-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
              : "absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
          }
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 transition text-left"
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === lang && <Check size={15} className="text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
