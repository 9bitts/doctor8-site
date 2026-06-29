"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, FileText } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, type Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import TelemedicineTcleConsent from "@/components/consent/TelemedicineTcleConsent";
import HumanitarianFlowStepper from "@/components/humanitarian/HumanitarianFlowStepper";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

export default function HumanitarianTclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = VENEZUELA_CAMPAIGN_SLUG;
  const returnTo = searchParams.get("return") || `/humanitarian/${slug}`;

  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=/humanitarian/${slug}/tcle`);
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/humanitarian/volunteer");
          return;
        }

        const intakeRes = await fetch(`/api/humanitarian/intake?campaignSlug=${slug}`);
        const intakeData = await intakeRes.json();
        if (!intakeRes.ok || !intakeData.intake?.triageValid) {
          router.replace(`/humanitarian/${slug}/triage`);
          return;
        }
        if (intakeData.intake?.tcleAccepted) {
          router.replace(returnTo);
          return;
        }

        const tcleRes = await fetch("/api/consent/telemedicine-tcle");
        const tcleData = await tcleRes.json();
        if (tcleRes.ok && tcleData.granted) {
          router.replace(returnTo);
          return;
        }

        setLoading(false);
      })
      .catch(() => router.push(`/login?callbackUrl=/humanitarian/${slug}/tcle`));
  }, [router, slug, returnTo]);

  async function submit() {
    if (!accepted) {
      setError(t(lang, "tcle.required"));
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(t(lang, "hum.offline.submitBlocked"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent/telemedicine-tcle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(lang, "tcle.error"));
        setSubmitting(false);
        return;
      }
      router.push(returnTo);
    } catch {
      setError(t(lang, "tcle.error"));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-400" />
        </div>
      </HumanitarianShell>
    );
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <div className="max-w-lg mx-auto space-y-6 py-4">
        <HumanitarianFlowStepper lang={lang} current="tcle" dark />
        <HumanitarianOfflineBanner lang={lang} />
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <FileText size={22} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-emerald-400/80 uppercase tracking-wide font-medium">
              {t(lang, "tcle.stepEyebrow")}
            </p>
            <h1 className="text-xl font-bold text-white mt-1">{t(lang, "tcle.title")}</h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{t(lang, "tcle.subtitle")}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-400 leading-relaxed">
          {t(lang, "tcle.summary")}
        </div>

        <TelemedicineTcleConsent
          lang={lang}
          checked={accepted}
          onChange={setAccepted}
          dark
        />

        {error && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : t(lang, "tcle.continue")}
        </button>

        <p className="text-center text-xs text-slate-500">
          <Link href="/tcle-telemedicina" target="_blank" className="text-emerald-500 hover:underline">
            {t(lang, "tcle.readFull")}
          </Link>
        </p>
      </div>
    </HumanitarianShell>
  );
}
