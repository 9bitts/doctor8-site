"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, FileText } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import TelemedicineTcleConsent from "@/components/consent/TelemedicineTcleConsent";

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const s = localStorage.getItem("doctor8.lang") || "";
    if (s.startsWith("es")) return "es";
    if (s.startsWith("en")) return "en";
  } catch { /* ignore */ }
  return "pt";
}

export default function PatientTclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/patient";

  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=${encodeURIComponent(`/patient/tcle?returnUrl=${returnUrl}`)}`);
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push(returnUrl);
          return;
        }
        const tcleRes = await fetch("/api/consent/telemedicine-tcle");
        const tcleData = await tcleRes.json();
        if (tcleRes.ok && tcleData.granted) {
          router.replace(returnUrl);
          return;
        }
        setLoading(false);
      });
  }, [router, returnUrl]);

  async function submit() {
    if (!accepted) {
      setError(t(lang, "tcle.required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent/telemedicine-tcle", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t(lang, "tcle.error"));
        setSubmitting(false);
        return;
      }
      router.push(returnUrl);
    } catch {
      setError(t(lang, "tcle.error"));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <FileText size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-emerald-700 uppercase tracking-wide font-medium">
              {t(lang, "tcle.stepEyebrow")}
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{t(lang, "tcle.title")}</h1>
            <p className="text-sm text-slate-500 mt-2">{t(lang, "tcle.subtitleConsult")}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{t(lang, "tcle.summary")}</p>

        <TelemedicineTcleConsent lang={lang} checked={accepted} onChange={setAccepted} />

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : t(lang, "tcle.continueConsult")}
        </button>

        <p className="text-center text-xs text-slate-400">
          <Link href="/tcle-telemedicina" target="_blank" className="text-emerald-700 hover:underline">
            {t(lang, "tcle.readFull")}
          </Link>
        </p>
      </div>
    </div>
  );
}
