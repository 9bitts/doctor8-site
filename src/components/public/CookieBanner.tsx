"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getLandingContent } from "@/lib/landing-content";

const STORAGE_KEY = "d8_cookies";

export default function CookieBanner() {
  const { lang } = useI18n();
  const c = getLandingContent(lang);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss(value: string) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setVisible(false);
  }

  const privacyLabel = lang === "en" ? "Privacy Policy" : lang === "es" ? "Pol?tica de Privacidad" : "Pol?tica de Privacidade";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-wrap items-center gap-4 border-t-2 border-accent-500 bg-[#0c1a27] px-6 py-4 text-white">
      <p className="min-w-[200px] flex-1 text-[13px] opacity-85">
        {c.cookie.text}{" "}
        <Link href="/privacy" className="text-accent-400 underline">{privacyLabel}</Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={() => dismiss("accepted")} className="rounded-lg bg-accent-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-accent-600">
          {c.cookie.accept}
        </button>
        <button type="button" onClick={() => dismiss("declined")} className="rounded-lg border border-white/30 bg-transparent px-5 py-2 text-[13px] font-semibold text-white hover:border-white/50">
          {c.cookie.decline}
        </button>
      </div>
    </div>
  );
}
