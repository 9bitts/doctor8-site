"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { formatCnpj, stripCnpj, isValidCnpj } from "@/lib/cnpj";
import { EMPLOYER_LOGIN, buildRegisterSuccessHref } from "@/lib/auth-portals";
import { existingAccountMessage, registerSuccessFollowUp } from "@/lib/auth-flow-errors";
import { buildAuthHref } from "@/components/auth/login-shared";
import RegisterVerificationNotice from "@/components/auth/RegisterVerificationNotice";
import { RegisterLogo } from "@/components/auth/register-shared";
import InternationalPhoneInput, { type InternationalPhoneValue } from "@/components/InternationalPhoneInput";
import { validateRegistrationPhone } from "@/lib/international-phone";
import { Eye, EyeOff, Loader2, AlertCircle, Building2, ArrowLeft, Search, LogIn, Shield } from "lucide-react";

const LANG_KEY = "doctor8.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  return "pt";
}

export default function EmpresasCadastroPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => { setLang(detectInitialLang()); }, []);
  const t = (key: string) => translate(lang, key);

  const [step, setStep] = useState<1 | 2>(1);
  const [manualMode, setManualMode] = useState(false);
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
  const [phone, setPhone] = useState<InternationalPhoneValue>({ ddi: "55", nationalNumber: "" });
  const [employeeCount, setEmployeeCount] = useState("");
  const [grauRisco, setGrauRisco] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGdpr, setAcceptedGdpr] = useState(false);

  async function lookupCnpj() {
    const digits = stripCnpj(cnpj);
    if (!isValidCnpj(digits)) {
      setErrors({ cnpj: ["CNPJ inválido"] });
      return;
    }
    setLookupLoading(true);
    setErrors({});
    try {
      const res = await fetch(`/api/cnpj/lookup?cnpj=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        if (isValidCnpj(digits)) {
          setErrors({
            cnpj: [
              "Não foi possível consultar a Receita Federal agora. Você pode continuar preenchendo os dados manualmente.",
            ],
          });
        } else {
          setErrors({ cnpj: ["CNPJ não encontrado"] });
        }
        return;
      }
      setRazaoSocial(data.razaoSocial || "");
      setNomeFantasia(data.nomeFantasia || data.razaoSocial || "");
      setAddressCity(data.addressCity || "");
      setAddressState(data.addressState || "");
      setManualMode(false);
      setStep(2);
    } catch {
      setErrors({ general: ["Erro ao consultar CNPJ"] });
    } finally {
      setLookupLoading(false);
    }
  }

  function continueManually() {
    const digits = stripCnpj(cnpj);
    if (!isValidCnpj(digits)) {
      setErrors({ cnpj: ["CNPJ inválido"] });
      return;
    }
    setManualMode(true);
    setRazaoSocial("");
    setNomeFantasia("");
    setAddressCity("");
    setAddressState("");
    setErrors({});
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy || !acceptedGdpr) return;

    const phoneCheck = validateRegistrationPhone(phone.ddi, phone.nationalNumber);
    if (!phoneCheck.ok) {
      setErrors({ phoneNational: ["Telefone inválido"] });
      return;
    }

    if (!razaoSocial.trim() || !nomeFantasia.trim()) {
      setErrors({ general: ["Informe razão social e nome fantasia da empresa."] });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register-employer", {
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
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
          employeeCount: employeeCount ? parseInt(employeeCount, 10) : undefined,
          grauRisco: grauRisco ? parseInt(grauRisco, 10) : undefined,
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
        setErrors(data.error || { general: ["Falha no cadastro"] });
        return;
      }
      const followUp = registerSuccessFollowUp(data);
      if (followUp.kind === "existingAccount") {
        setErrors({ email: [existingAccountMessage(lang)] });
        return;
      }
      const emailSent =
        followUp.kind === "verify" ? followUp.emailSent : data.emailSent !== false;
      router.push(
        buildRegisterSuccessHref({
          role: "EMPLOYER",
          email,
          callbackUrl: "/empresas/painel",
          emailSent,
        }),
      );
    } catch {
      setErrors({ general: ["Erro inesperado. Tente novamente."] });
    } finally {
      setLoading(false);
    }
  }

  function onCnpjChange(value: string) {
    setCnpj(formatCnpj(stripCnpj(value).slice(0, 14)));
  }

  const loginHref = buildAuthHref(EMPLOYER_LOGIN, { callbackUrl: "/empresas/painel" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <RegisterLogo />
        <div className="flex items-center justify-center gap-2 text-sky-300 mb-2">
          <Shield size={18} />
          <span className="text-sm font-medium">Doctor8 Empresas · NR-1</span>
        </div>
        <p className="text-slate-400 -mt-2 mb-8 text-sm text-center">{t("emp.register.subtitle")}</p>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {errors.general[0]}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block text-sm text-slate-300">
                CNPJ da empresa
                <div className="mt-1 flex gap-2">
                  <input
                    value={cnpj}
                    onChange={(e) => onCnpjChange(e.target.value)}
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                    placeholder="00.000.000/0000-00"
                  />
                  <button
                    type="button"
                    onClick={lookupCnpj}
                    disabled={lookupLoading}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium flex items-center gap-1"
                  >
                    {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Buscar
                  </button>
                </div>
                {errors.cnpj && <p className="text-red-400 text-xs mt-1">{errors.cnpj[0]}</p>}
              </label>
              {errors.cnpj && isValidCnpj(stripCnpj(cnpj)) && (
                <button
                  type="button"
                  onClick={continueManually}
                  className="w-full py-2.5 rounded-lg border border-sky-500/40 text-sky-300 text-sm hover:bg-sky-500/10"
                >
                  Continuar com preenchimento manual
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3 text-sm text-sky-100 flex gap-2">
                <Building2 size={16} className="shrink-0 mt-0.5" />
                <div>
                  {manualMode ? (
                    <p className="text-sky-200/80 text-xs">Preenchimento manual · {cnpj}</p>
                  ) : (
                    <>
                      <p className="font-medium">{nomeFantasia}</p>
                      <p className="text-sky-200/70 text-xs">{cnpj}</p>
                    </>
                  )}
                </div>
              </div>

              {manualMode && (
                <div className="space-y-3">
                  <input
                    required
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Razão social"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  />
                  <input
                    required
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome fantasia"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Cidade"
                      className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                    />
                    <input
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF"
                      className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={responsibleFirstName}
                  onChange={(e) => setResponsibleFirstName(e.target.value)}
                  placeholder="Nome responsável SST/RH"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
                <input
                  required
                  value={responsibleLastName}
                  onChange={(e) => setResponsibleLastName(e.target.value)}
                  placeholder="Sobrenome"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
              </div>

              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail corporativo"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
              />

              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha (8+ chars, maiúscula, número, símbolo)"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <InternationalPhoneInput value={phone} onChange={setPhone} lang={lang} dark region="BR" />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  placeholder="Nº colaboradores CLT"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
                <select
                  value={grauRisco}
                  onChange={(e) => setGrauRisco(e.target.value)}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                >
                  <option value="">Grau de risco</option>
                  {[1, 2, 3, 4].map((g) => (
                    <option key={g} value={g} className="text-slate-900">Grau {g}</option>
                  ))}
                </select>
              </div>

              <RegisterVerificationNotice lang={lang} />

              <div className="space-y-2">
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
                disabled={loading || !acceptedTerms || !acceptedPrivacy || !acceptedGdpr || !validateRegistrationPhone(phone.ddi, phone.nationalNumber).ok}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                Criar conta empresarial
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setManualMode(false); }}
                className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} /> Voltar ao CNPJ
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            Já tem conta?{" "}
            <Link href={loginHref} className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1">
              <LogIn size={14} /> Entrar
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/empresas" className="text-slate-500 hover:text-slate-300 text-sm">
            ← Voltar para Doctor8 Empresas
          </Link>
        </p>
      </div>
    </div>
  );
}
