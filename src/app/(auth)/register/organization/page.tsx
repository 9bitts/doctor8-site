"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { translate, normalizeLang, LANGUAGES, Lang } from "@/lib/i18n/translations";
import { formatCnpj, stripCnpj, isValidCnpj } from "@/lib/cnpj";
import { ORGANIZATION_LOGIN, buildVerifyAccountHref } from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import {
  Eye, EyeOff, Loader2, AlertCircle, Building2, ArrowLeft, Search, LogIn,
} from "lucide-react";

const LANG_KEY = "doctor8.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  const nav = (navigator.language || "pt").toLowerCase();
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => { setLang(detectInitialLang()); }, []);
  const t = (key: string) => translate(lang, key);

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [responsibleFirstName, setResponsibleFirstName] = useState("");
  const [responsibleLastName, setResponsibleLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGdpr, setAcceptedGdpr] = useState(false);

  async function lookupCnpj() {
    const digits = stripCnpj(cnpj);
    if (!isValidCnpj(digits)) {
      setErrors({ cnpj: [t("org.invalidCnpj")] });
      return;
    }
    setLookupLoading(true);
    setErrors({});
    try {
      const res = await fetch(`/api/cnpj/lookup?cnpj=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        setErrors({ cnpj: [t("org.cnpjNotFound")] });
        return;
      }
      setRazaoSocial(data.razaoSocial || "");
      setNomeFantasia(data.nomeFantasia || data.razaoSocial || "");
      setAddressCity(data.addressCity || "");
      setAddressState(data.addressState || "");
      setStep(2);
    } catch {
      setErrors({ general: [t("org.lookupError")] });
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy || !acceptedGdpr) return;

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          cnpj: stripCnpj(cnpj),
          razaoSocial,
          nomeFantasia,
          responsibleFirstName,
          responsibleLastName,
          contactPhone,
          addressCity,
          addressState,
          language: lang,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acceptedGdpr: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.error || { general: [t("reg.regFailed")] });
        return;
      }
      router.push(
        buildVerifyAccountHref({
          email,
          callbackUrl: "/organization",
          from: ORGANIZATION_LOGIN,
        }),
      );
    } catch {
      setErrors({ general: [t("reg.genericError")] });
    } finally {
      setLoading(false);
    }
  }

  function onCnpjChange(value: string) {
    const digits = stripCnpj(value).slice(0, 14);
    setCnpj(formatCnpj(digits));
  }

  const loginHref = buildAuthHref(ORGANIZATION_LOGIN, {
    callbackUrl: "/organization",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-indigo-400">8</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">{t("org.registerSubtitle")}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Link
            href="/register/professional"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("reg.back")}
          </Link>

          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-sm font-medium text-indigo-300">{t("org.accountType")}</p>
          </div>

          <Link
            href={loginHref}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-indigo-500 hover:bg-indigo-500/10 transition text-left group mb-6"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition">
              <LogIn className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-white font-semibold text-sm">
              {t("reg.haveAccount")}{" "}
              <span className="text-indigo-400 group-hover:text-indigo-300">{t("reg.signIn")}</span>
            </p>
          </Link>

          {errors.general && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{errors.general[0]}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => onCnpjChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                {errors.cnpj && <p className="text-red-400 text-xs mt-1">{errors.cnpj[0]}</p>}
              </div>
              <button
                type="button"
                onClick={lookupCnpj}
                disabled={lookupLoading || stripCnpj(cnpj).length !== 14}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {lookupLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {t("org.lookupCnpj")}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full text-slate-400 hover:text-white text-sm transition"
              >
                {t("org.manualEntry")}
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("org.razaoSocial")}</label>
                  <input
                    required
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("org.nomeFantasia")}</label>
                  <input
                    required
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("reg.firstName")}</label>
                  <input
                    required
                    value={responsibleFirstName}
                    onChange={(e) => setResponsibleFirstName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("reg.lastName")}</label>
                  <input
                    required
                    value={responsibleLastName}
                    onChange={(e) => setResponsibleLastName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("reg.email")}</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email[0]}</p>}
                </div>
                <div className="col-span-2 relative">
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("reg.password")}</label>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("org.phone")}</label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t("org.city")}</label>
                  <input
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" />
                  {t("reg.acceptTerms")}
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} className="mt-1" />
                  {t("reg.acceptPrivacy")}
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={acceptedGdpr} onChange={(e) => setAcceptedGdpr(e.target.checked)} className="mt-1" />
                  {t("org.acceptLgpd")}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !acceptedTerms || !acceptedPrivacy || !acceptedGdpr}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {t("org.createAccount")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
