"use client";

// src/lib/i18n/I18nProvider.tsx
// Provides the current language + a t() function to the whole dashboard.
// Persists the choice to the user account (User.language) via API,
// and mirrors it in localStorage for instant load on next visit.

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Lang, translate, TranslationKey } from "./translations";

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey | string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "doctor8.lang";

function normalize(value: string | null | undefined): Lang {
  if (value === "pt" || value === "en" || value === "es") return value;
  return "en";
}

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang?: string;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(normalize(initialLang));

  // On mount, prefer localStorage (instant), then fall back to session value.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLangState(normalize(stored));
        return;
      }
    } catch { /* ignore */ }

    // No local value: ask the session for the saved language.
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const fromUser = session?.user?.language;
        if (fromUser) setLangState(normalize(fromUser));
      } catch { /* ignore */ }
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    // Persist to the account (best-effort, no blocking).
    fetch("/api/user/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: l }),
    }).catch(() => { /* ignore */ });
  }, []);

  const t = useCallback((key: TranslationKey | string) => translate(lang, key), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// Convenience hook when you only need t()
export function useT() {
  return useContext(I18nContext).t;
}
