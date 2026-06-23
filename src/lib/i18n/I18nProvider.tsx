"use client";

// src/lib/i18n/I18nProvider.tsx
// Provides the current language + a t() function to the whole dashboard.
// Persists the choice to the user account (User.language) via API,
// and mirrors it in localStorage for instant load on next visit.

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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

function persistLangCookie(l: Lang) {
  try {
    document.cookie = `${STORAGE_KEY}=${l};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  } catch { /* ignore */ }
}

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const syncedCookie = useRef(false);
  const [lang, setLangState] = useState<Lang>(normalize(initialLang));

  // On mount, prefer localStorage (instant), then fall back to session value.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const l = normalize(stored);
        setLangState(l);
        const hadCookie = document.cookie.includes(`${STORAGE_KEY}=`);
        persistLangCookie(l);
        if (!hadCookie && !syncedCookie.current) {
          syncedCookie.current = true;
          router.refresh();
        }
        return;
      }
    } catch { /* ignore */ }

    // No local value: ask the session for the saved language.
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const fromUser = session?.user?.language;
        if (fromUser) {
          const l = normalize(fromUser);
          setLangState(l);
          persistLangCookie(l);
        }
      } catch { /* ignore */ }
    })();
  }, [router]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    persistLangCookie(l);
    router.refresh();
    // Persist to the account (best-effort, no blocking).
    fetch("/api/user/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: l }),
    }).catch(() => { /* ignore */ });
  }, [router]);

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
