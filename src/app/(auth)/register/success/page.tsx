"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, Loader2 } from "lucide-react";
import { translate, normalizeLang, type Lang } from "@/lib/i18n/translations";
import { buildVerifyAccountHref, MAIN_LOGIN } from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import { RegisterLanguageSelector, RegisterLogo } from "@/components/auth/register-shared";

const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

function roleAccent(role: string): "emerald" | "rose" | "indigo" | "teal" | "violet" {
  if (role === "ANGEL") return "rose";
  if (role === "ORGANIZATION") return "indigo";
  if (role === "EMPLOYER") return "indigo";
  if (role === "INTEGRATIVE_THERAPIST") return "teal";
  if (role === "PSYCHOANALYST") return "violet";
  return "emerald";
}

function RegisterSuccessInner() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>("en");

  const role = searchParams.get("role") || "PATIENT";
  const email = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl") || undefined;
  const emailSent = searchParams.get("emailSent") !== "0";
  const accent = roleAccent(role);
  const t = (key: string) => translate(lang, key);

  useEffect(() => { setLang(detectLang()); }, []);

  function changeLang(next: Lang) {
    setLang(next);
    try { window.localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }

  const verifyHref = buildVerifyAccountHref({
    email,
    callbackUrl,
    from: MAIN_LOGIN,
  });

  const accentRing =
    accent === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
      : accent === "indigo"
        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
        : accent === "teal"
          ? "border-teal-500/30 bg-teal-500/10 text-teal-400"
          : accent === "violet"
            ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

  const btnClass =
    accent === "rose"
      ? "bg-rose-500 hover:bg-rose-600"
      : accent === "indigo"
        ? "bg-indigo-500 hover:bg-indigo-600"
        : accent === "teal"
          ? "bg-teal-500 hover:bg-teal-600"
          : accent === "violet"
            ? "bg-violet-500 hover:bg-violet-600"
            : "bg-emerald-500 hover:bg-emerald-600";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <RegisterLanguageSelector lang={lang} onChange={changeLang} accent={accent} />
        <RegisterLogo accent={accent} />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${accentRing}`}
          >
            <CheckCircle2 className="w-10 h-10" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">{t("registerSuccess.title")}</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{t("registerSuccess.subtitle")}</p>

          {email && (
            <p className="text-slate-500 text-xs mb-6 break-all">{email}</p>
          )}

          <div className="text-left space-y-3 mb-8">
            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <Mail className={`w-5 h-5 shrink-0 mt-0.5 ${accentRing.split(" ").pop()}`} aria-hidden />
              <p className="text-slate-300 text-sm leading-relaxed">
                {emailSent ? t("registerSuccess.verifyEmail") : t("registerSuccess.verifyEmailFailed")}
              </p>
            </div>
            {role === "ANGEL" && (
              <p className="text-slate-400 text-sm leading-relaxed px-1">
                {t("registerSuccess.angelApproval")}
              </p>
            )}
          </div>

          <Link
            href={verifyHref}
            className={`inline-flex items-center justify-center w-full ${btnClass} text-white font-semibold py-3 rounded-xl transition`}
          >
            {t("registerSuccess.continue")}
          </Link>

          {!emailSent && email && (
            <p className="mt-4 text-slate-500 text-xs">
              <Link href={verifyHref} className="text-slate-300 hover:text-white underline">
                {t("registerSuccess.resendEmail")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      )}
    >
      <RegisterSuccessInner />
    </Suspense>
  );
}
