"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import {
  Stethoscope, LogIn, Brain, Building2, ArrowLeft, Leaf,
} from "lucide-react";
import {
  detectInitialLang,
  LANG_KEY,
  Region,
  RegisterRole,
  RegisterAccountForm,
  RegisterAlternateLink,
  RegisterLanguageSelector,
  RegisterLogo,
} from "@/components/auth/register-shared";

type ProRole = "PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

export default function RegisterProfessionalSignupPage() {
  const [callbackUrl, setCallbackUrl] = useState("");
  const [initialRegion, setInitialRegion] = useState<Region>("US");
  const [lang, setLang] = useState<Lang>("en");
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<ProRole>("PROFESSIONAL");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "");

    const r = params.get("region");
    if (r === "VE" || r === "US" || r === "EU" || r === "BR") {
      setInitialRegion(r as Region);
    }

    const roleParam = params.get("role");
    if (roleParam === "PROFESSIONAL" || roleParam === "PSYCHOANALYST" || roleParam === "INTEGRATIVE_THERAPIST") {
      setRole(roleParam);
      setStep(2);
    }

    const langParam = params.get("lang");
    if (langParam) {
      const l = normalizeLang(langParam);
      setLang(l);
      try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { setLang(detectInitialLang()); }, []);

  const t = (key: string) => translate(lang, key);

  function changeLang(l: Lang) {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }

  function chooseRole(r: ProRole) {
    setRole(r);
    setStep(2);
  }

  const loginHref = (() => {
    const registerUrl = encodeURIComponent("/register/professional/signup");
    if (callbackUrl) {
      return `/login?registerUrl=${registerUrl}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return `/login?registerUrl=${registerUrl}`;
  })();

  const patientHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  const orgHref = callbackUrl
    ? `/register/organization?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register/organization";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link href="/register/professional" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft size={14} />
            Doctor8
          </Link>
        </div>
        <RegisterLanguageSelector lang={lang} onChange={changeLang} />
        <RegisterLogo />

        {step === 1 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <Link
              href={loginHref}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition text-left group mb-6"
            >
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
                <LogIn className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-base">
                  {t("reg.haveAccount")}{" "}
                  <span className="text-emerald-400 group-hover:text-emerald-300">{t("reg.signIn")}</span>
                </p>
              </div>
            </Link>

            <p className="text-center text-slate-300 text-sm mb-6">
              {t("reg.howUsePro")}
            </p>

            <div className="space-y-4">
              <button
                onClick={() => chooseRole("PROFESSIONAL")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
                  <Stethoscope className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imPro")}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{t("reg.imProDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("PSYCHOANALYST")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-violet-500 hover:bg-violet-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition">
                  <Brain className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imPsychoanalyst")}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{t("reg.imPsychoanalystDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("INTEGRATIVE_THERAPIST")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-teal-500 hover:bg-teal-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition">
                  <Leaf className="w-7 h-7 text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imIntegrative")}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{t("reg.imIntegrativeDesc")}</p>
                </div>
              </button>

              <Link
                href={orgHref}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-indigo-500 hover:bg-indigo-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition">
                  <Building2 className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imOrganization")}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{t("reg.imOrganizationDesc")}</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <RegisterAccountForm
              role={role as RegisterRole}
              lang={lang}
              callbackUrl={callbackUrl}
              initialRegion={initialRegion}
              onBack={() => setStep(1)}
            />
          </div>
        )}

        <RegisterAlternateLink href={patientHref}>
          {t("reg.switchToPatient")}
        </RegisterAlternateLink>
      </div>
    </div>
  );
}
