"use client";

// src/app/(auth)/register/page.tsx
// Step 1: choose role (Patient / Professional)
// Step 2: registration form. i18n: standalone language selector (outside the
// dashboard I18nProvider). Language is read from localStorage (same key the
// dashboard uses) or detected from the browser, and persisted so the dashboard
// opens in the same language after login.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { translate, normalizeLang, LANGUAGES, Lang } from "@/lib/i18n/translations";
import { persistAuthCallback } from "@/lib/auth-callback";
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
  User, Stethoscope, ArrowLeft, LogIn,
} from "lucide-react";

type Role = "PATIENT" | "PROFESSIONAL";
type Region = "US" | "EU" | "BR";

const LANG_KEY = "doctor8.lang";

function detectInitialLang(): Lang {
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

export default function RegisterPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    setCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl") || "");
  }, []);

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(detectInitialLang()); }, []);
  const t = (key: string) => translate(lang, key);

  function changeLang(l: Lang) {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("PATIENT");
  const [region, setRegion] = useState<Region>("US");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedHipaa, setAcceptedHipaa] = useState(false);
  const [acceptedGdpr, setAcceptedGdpr] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const PASSWORD_RULES = [
    { key: "reg.rule8",      test: (p: string) => p.length >= 8 },
    { key: "reg.ruleUpper",  test: (p: string) => /[A-Z]/.test(p) },
    { key: "reg.ruleNumber", test: (p: string) => /[0-9]/.test(p) },
    { key: "reg.ruleSpecial",test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const isPasswordValid = passwordStrength === PASSWORD_RULES.length;

  const canSubmit =
    isPasswordValid &&
    acceptedTerms &&
    acceptedPrivacy &&
    (region !== "US" || acceptedHipaa) &&
    (region !== "EU" || acceptedGdpr);

  function chooseRole(r: Role) {
    setRole(r);
    setStep(2);
    setErrors({});
  }

  async function handleGoogleSignUp() {
    document.cookie = `signup_role=${role}; path=/; max-age=600; SameSite=Lax`;
    setGoogleLoading(true);
    persistAuthCallback(callbackUrl);
    await signIn("google", { callbackUrl: "/callback" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          region,
          firstName,
          lastName,
          language: lang,
          acceptedTerms,
          acceptedPrivacy,
          acceptedHipaa: region === "US" ? acceptedHipaa : undefined,
          acceptedGdpr: region === "EU" ? acceptedGdpr : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.error || { general: [t("reg.regFailed")] });
        return;
      }

      router.push(
        callbackUrl
          ? `/verify-email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
          : `/verify-email?email=${encodeURIComponent(email)}`
      );
    } catch {
      setErrors({ general: [t("reg.genericError")] });
    } finally {
      setLoading(false);
    }
  }

  const isProfessional = role === "PROFESSIONAL";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Language selector (top right) */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => changeLang(l.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                  lang === l.code ? "bg-emerald-500 text-white" : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                aria-label={l.label}
              >
                <span>{l.flag}</span>
                <span className="uppercase">{l.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>

        {/* STEP 1: ROLE CHOICE */}
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
              {t("reg.howUse")}
            </p>

            <div className="space-y-4">
              <button
                onClick={() => chooseRole("PATIENT")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
                  <User className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{t("reg.imPatient")}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{t("reg.imPatientDesc")}</p>
                </div>
              </button>

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
            </div>
          </div>
        )}

        {/* STEP 2: REGISTRATION FORM */}
        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("reg.back")}
            </button>

            <div className="flex items-center gap-3 mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              {isProfessional ? (
                <Stethoscope className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <User className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <p className="text-emerald-300 text-sm font-medium">
                {isProfessional ? t("reg.proAccount") : t("reg.patientAccount")}
              </p>
            </div>

            {errors.general && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{errors.general[0]}</p>
              </div>
            )}

            <button
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 rounded-xl transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {isProfessional ? t("reg.googlePro") : t("reg.googlePatient")}
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs uppercase tracking-wider">{t("reg.or")}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.region")}</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                >
                  <option value="US" className="bg-slate-800">{t("reg.regionUS")}</option>
                  <option value="EU" className="bg-slate-800">{t("reg.regionEU")}</option>
                  <option value="BR" className="bg-slate-800">{t("reg.regionBR")}</option>
                </select>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.firstName")}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.lastName")}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email[0]}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t("reg.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    aria-label={showPassword ? t("reg.hidePassword") : t("reg.showPassword")}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {password && (
                  <div className="mt-3 space-y-1">
                    {PASSWORD_RULES.map((rule) => (
                      <div key={rule.key} className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${rule.test(password) ? "text-emerald-400" : "text-slate-600"}`}
                        />
                        <span className={`text-xs ${rule.test(password) ? "text-emerald-400" : "text-slate-500"}`}>
                          {t(rule.key)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isProfessional && (
                <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl p-3">
                  {t("reg.proNote")}
                </p>
              )}

              {/* Consents */}
              <div className="border-t border-white/10 pt-5 space-y-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t("reg.requiredAgreements")}</p>

                <Checkbox
                  checked={acceptedTerms}
                  onChange={setAcceptedTerms}
                  label={<>{t("reg.acceptTerms")} <Link href="/terms" className="text-emerald-400 hover:underline" target="_blank">{t("reg.termsOfService")}</Link></>}
                />
                <Checkbox
                  checked={acceptedPrivacy}
                  onChange={setAcceptedPrivacy}
                  label={<>{t("reg.acceptPrivacy")} <Link href="/privacy" className="text-emerald-400 hover:underline" target="_blank">{t("reg.privacyPolicy")}</Link></>}
                />
                {region === "US" && (
                  <Checkbox
                    checked={acceptedHipaa}
                    onChange={setAcceptedHipaa}
                    label={<>{t("reg.acceptHipaaPre")} <Link href="/hipaa" className="text-emerald-400 hover:underline" target="_blank">{t("reg.hipaaAuth")}</Link> {t("reg.acceptHipaaPost")}</>}
                  />
                )}
                {region === "EU" && (
                  <Checkbox
                    checked={acceptedGdpr}
                    onChange={setAcceptedGdpr}
                    label={<>{t("reg.acceptGdprPre")} <Link href="/privacy" className="text-emerald-400 hover:underline" target="_blank">{t("reg.privacyPolicy")}</Link> {t("reg.acceptGdprPost")}</>}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading || !canSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? t("reg.creating") : t("reg.createAccount")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
          checked ? "bg-emerald-500 border-emerald-500" : "border-white/20 bg-white/5"
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-300 leading-relaxed">{label}</span>
    </label>
  );
}
