"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import {
  Stethoscope, LogIn, Brain, Building2, ArrowLeft, Leaf, Heart, Utensils, HeartPulse, Pill, Smile,
} from "lucide-react";
import { parseRegistrationRegion, defaultRegistrationRegionForLang } from "@/lib/registration-regions";
import { ANGEL_REGISTER, LOGIN, ORGANIZATION_REGISTER } from "@/lib/auth-portals";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { buildAuthHref } from "@/components/auth/login-shared";
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
import {
  resolveProfessionalSignupParams,
  resolveRegisterProfessionSlug,
  type ProSignupRole,
  type ProfessionSignupSlug,
} from "@/lib/professional-signup-params";
import type { LoginAccent } from "@/lib/auth-portals";

function signupAccentForRole(role: ProSignupRole): LoginAccent {
  switch (role) {
    case "PSYCHOLOGIST":
    case "PSYCHOANALYST":
      return "violet";
    case "INTEGRATIVE_THERAPIST":
      return "teal";
    case "NUTRITIONIST":
      return "amber";
    case "NURSE":
      return "rose";
    case "PHARMACIST":
      return "teal";
    case "DENTIST":
      return "sky";
    default:
      return "emerald";
  }
}

export default function RegisterProfessionalSignupPage() {
  const [callbackUrl, setCallbackUrl] = useState("");
  const [initialRegion, setInitialRegion] = useState<Region>("BR");
  const [lang, setLang] = useState<Lang>("en");
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<ProSignupRole>("PROFESSIONAL");
  const [professionSlug, setProfessionSlug] = useState<ProfessionSignupSlug | undefined>(undefined);
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "");
    const invite = params.get("invite");
    if (invite) setInviteToken(invite);

    const langParam = params.get("lang");
    if (langParam) {
      const l = normalizeLang(langParam);
      setLang(l);
      try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    } else {
      setLang(detectInitialLang());
    }

    const resolved = resolveProfessionalSignupParams({
      portal: params.get("portal"),
      role: params.get("role"),
      profession: params.get("profession"),
    });
    setRole(resolved.role);
    setProfessionSlug(resolved.professionSlug);
    setStep(resolved.step);

    const r = params.get("region");
    if (r) {
      setInitialRegion(parseRegistrationRegion(r, "BR"));
    } else {
      const detectedLang = langParam ? normalizeLang(langParam) : detectInitialLang();
      fetch(`/api/auth/detect-region?lang=${encodeURIComponent(detectedLang)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.region) {
            setInitialRegion(parseRegistrationRegion(data.region, defaultRegistrationRegionForLang(detectedLang)));
          } else {
            setInitialRegion(defaultRegistrationRegionForLang(detectedLang));
          }
        })
        .catch(() => {
          setInitialRegion(defaultRegistrationRegionForLang(detectedLang));
        });
    }
  }, []);

  const t = (key: string) => translate(lang, key);

  function changeLang(l: Lang) {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }

  function chooseRole(r: ProSignupRole) {
    setRole(r);
    if (r === "NUTRITIONIST") {
      setProfessionSlug("nutricionista");
    } else if (r === "NURSE") {
      setProfessionSlug("enfermeiro");
    } else if (r === "PHARMACIST") {
      setProfessionSlug("farmaceutico");
    } else if (r === "DENTIST") {
      setProfessionSlug("dentista");
    } else if (r === "PROFESSIONAL") {
      setProfessionSlug(undefined);
    } else {
      setProfessionSlug(undefined);
    }
    setStep(2);
  }

  const loginHref = buildAuthHref(LOGIN, { callbackUrl });

  const orgHref = buildAuthHref(ORGANIZATION_REGISTER, { callbackUrl });

  const angelHref = (() => {
    const params = new URLSearchParams();
    if (callbackUrl) params.set("callbackUrl", callbackUrl);
    if (initialRegion !== "BR") params.set("region", initialRegion);
    const qs = params.toString();
    return qs ? `${ANGEL_REGISTER}?${qs}` : ANGEL_REGISTER;
  })();

  const patientHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  const formAccent = signupAccentForRole(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link href="/register/professional" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft size={14} />
            <BrandLogo variant="on-dark" size="sm" />
          </Link>
        </div>
        <RegisterLanguageSelector lang={lang} onChange={changeLang} accent={formAccent} />
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

            <Link
              href={angelHref}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-rose-500 hover:bg-rose-500/10 transition text-left group mb-6"
            >
              <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition">
                <Heart className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-base">{t("reg.imAngel")}</p>
                <p className="text-slate-300 text-sm mt-0.5">{t("reg.imAngelDesc")}</p>
              </div>
            </Link>

            <p className="text-center text-slate-300 text-sm mb-6">
              {t("reg.proSignupPrompt")}
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
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imProDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("PSYCHOLOGIST")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-violet-500 hover:bg-violet-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition">
                  <Brain className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imPsychologist")}</p>
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imPsychologistDesc")}</p>
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
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imPsychoanalystDesc")}</p>
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
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imIntegrativeDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("NUTRITIONIST")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-yellow-500 hover:bg-yellow-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0 group-hover:bg-yellow-500/20 group-hover:border-yellow-400 transition">
                  <Utensils className="w-7 h-7 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imNutritionist")}</p>
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imNutritionistDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("NURSE")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-rose-500 hover:bg-rose-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition">
                  <HeartPulse className="w-7 h-7 text-rose-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imNurse")}</p>
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imNurseDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("PHARMACIST")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-teal-500 hover:bg-teal-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition">
                  <Pill className="w-7 h-7 text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imPharmacist")}</p>
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imPharmacistDesc")}</p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("DENTIST")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-sky-500 hover:bg-sky-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 group-hover:bg-sky-500/20 transition">
                  <Smile className="w-7 h-7 text-sky-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imDentist")}</p>
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imDentistDesc")}</p>
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
                  <p className="text-slate-300 text-sm mt-0.5">{t("reg.imOrganizationDesc")}</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <RegisterAccountForm
              role={role === "PSYCHOLOGIST" || role === "NUTRITIONIST" || role === "NURSE" || role === "PHARMACIST" || role === "DENTIST" ? "PROFESSIONAL" : role as RegisterRole}
              professionalKind={role === "PSYCHOLOGIST" ? "psychologist" : undefined}
              professionSlug={resolveRegisterProfessionSlug(role, professionSlug)}
              accent={formAccent}
              lang={lang}
              callbackUrl={callbackUrl}
              initialRegion={initialRegion}
              inviteToken={inviteToken || undefined}
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
