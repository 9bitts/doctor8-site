"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { LANGUAGES, Lang, normalizeLang } from "@/lib/i18n/translations";

const LANG_KEY = "doctor8.lang";

export function getHumanitarianLang(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  // Inside /humanitarian/* the default is always Spanish — browser locale
  // is ignored so Venezuelan patients are not shown Portuguese.
  return "es";
}

export function setHumanitarianLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch { /* ignore */ }
}

export default function HumanitarianLangSwitcher({
  lang,
  onChange,
  dark = false,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[2];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          dark
            ? "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 transition"
            : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
        }
        aria-label="Language"
      >
        <Globe size={16} />
        <span>{current.flag}</span>
        <span className="uppercase text-xs font-semibold">{current.code}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { onChange(l.code); setHumanitarianLang(l.code); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 transition text-left"
            >
              <span>{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === lang && <Check size={15} className="text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
