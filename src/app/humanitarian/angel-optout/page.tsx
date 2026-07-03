"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, type Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

function t(lang: Lang, key: string): string {
  return translate(lang, key);
}

export default function HumanitarianAngelOptOutPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setLang(getHumanitarianLang()); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/humanitarian/patient/angel-optout?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}`,
        );
        const data = await res.json();
        if (!cancelled && res.ok) setHasConsent(Boolean(data.hasConsent));
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function optOut() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/patient/angel-optout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSlug: VENEZUELA_CAMPAIGN_SLUG }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
      setHasConsent(false);
    } catch {
      setError(t(lang, "patient.angelOptOut.error"));
    }
    setBusy(false);
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <Heart className="w-6 h-6 text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-white">{t(lang, "patient.angelOptOut.title")}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
          </div>
        ) : done || !hasConsent ? (
          <p className="text-slate-300 text-sm leading-relaxed">
            {t(lang, "patient.angelOptOut.done")}
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              {t(lang, "patient.angelOptOut.desc")}
            </p>
            {error && (
              <p className="text-red-300 text-sm">{error}</p>
            )}
            <button
              type="button"
              onClick={optOut}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t(lang, "patient.angelOptOut.confirm")}
            </button>
          </div>
        )}

        <Link href="/patient" className="inline-block mt-8 text-sm text-slate-400 hover:text-white">
          &larr; {t(lang, "patient.angelOptOut.back")}
        </Link>
      </div>
    </HumanitarianShell>
  );
}
