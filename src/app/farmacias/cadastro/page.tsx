"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { formatCnpj, stripCnpj, isValidCnpj } from "@/lib/cnpj";
import { PHARMACY_STORE_LOGIN, buildRegisterSuccessHref } from "@/lib/auth-portals";
import RegisterVerificationNotice from "@/components/auth/RegisterVerificationNotice";
import { RegisterLogo } from "@/components/auth/register-shared";
import InternationalPhoneInput, { type InternationalPhoneValue } from "@/components/InternationalPhoneInput";
import { validateRegistrationPhone } from "@/lib/international-phone";
import { Eye, EyeOff, Loader2, AlertCircle, Pill, ArrowLeft, Search, LogIn } from "lucide-react";

const LANG_KEY = "doctor8.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  return "pt";
}

export default function FarmaciasCadastroPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => { setLang(detectInitialLang()); }, []);
  const t = (key: string) => translate(lang, key);

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
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
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
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
        setErrors({ cnpj: ["Não foi possível consultar o CNPJ. Preencha manualmente."] });
        setStep(2);
        return;
      }
      setRazaoSocial(data.razaoSocial || "");
      setNomeFantasia(data.nomeFantasia || data.razaoSocial || "");
      setAddressCity(data.addressCity || "");
      setAddressState(data.addressState || "");
      setStep(2);
    } catch {
      setErrors({ general: ["Erro ao consultar CNPJ"] });
    } finally {
      setLookupLoading(false);
    }
  }

  async function lookupCep() {
    const cep = addressZip.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`/api/cep/lookup?cep=${cep}`);
      const data = await res.json();
      if (res.ok) {
        setAddressStreet(data.street || "");
        setAddressNeighborhood(data.neighborhood || "");
        setAddressCity(data.city || "");
        setAddressState(data.state || "");
      }
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy || !acceptedGdpr) return;

    const phoneCheck = validateRegistrationPhone(phone.ddi, phone.nationalNumber);
    if (!phoneCheck.ok) {
      setErrors({ phoneNational: ["Telefone inválido"] });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register-pharmacy-store", {
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
          addressZip,
          addressStreet,
          addressNumber,
          addressNeighborhood,
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
      router.push(
        buildRegisterSuccessHref({
          role: "PHARMACY_STORE",
          email,
          callbackUrl: "/farmacias/painel",
          emailSent: data.emailSent !== false,
        }),
      );
    } catch {
      setErrors({ general: ["Erro de conexão"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link href="/farmacias" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <RegisterLogo />
        <div className="flex items-center gap-2 text-emerald-400 mb-2 mt-6">
          <Pill size={20} />
          <span className="font-semibold">Cadastro de farmácia</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Grátis — publique seus preços</h1>
        <p className="text-slate-400 text-sm mb-8">
          Cadastre o CNPJ da drogaria e importe seu estoque em seguida.
        </p>

        {step === 1 ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">CNPJ da farmácia</span>
              <input
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white"
                placeholder="00.000.000/0000-00"
              />
            </label>
            {errors.cnpj && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle size={14} /> {errors.cnpj[0]}
              </p>
            )}
            <button
              type="button"
              onClick={lookupCnpj}
              disabled={lookupLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {lookupLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Consultar CNPJ
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full text-slate-400 text-sm hover:text-white"
            >
              Preencher manualmente
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Razão social"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
            />
            <input
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Nome fantasia"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={responsibleFirstName}
                onChange={(e) => setResponsibleFirstName(e.target.value)}
                placeholder="Nome do responsável"
                required
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
              />
              <input
                value={responsibleLastName}
                onChange={(e) => setResponsibleLastName(e.target.value)}
                placeholder="Sobrenome"
                required
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
              />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (8+ caracteres, maiúscula, número, símbolo)"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <InternationalPhoneInput value={phone} onChange={setPhone} lang={lang} />

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <p className="text-sm text-slate-400 font-medium">Endereço (recomendado)</p>
              <div className="flex gap-2">
                <input
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="CEP"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
                />
                <button
                  type="button"
                  onClick={lookupCep}
                  disabled={cepLoading}
                  className="px-4 rounded-xl border border-slate-600 text-sm"
                >
                  {cepLoading ? <Loader2 size={16} className="animate-spin" /> : "CEP"}
                </button>
              </div>
              <input
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Rua"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Nº"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
                />
                <input
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Cidade"
                  className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
                />
              </div>
              <input
                value={addressState}
                onChange={(e) => setAddressState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UF"
                maxLength={2}
                className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={acceptedTerms && acceptedPrivacy && acceptedGdpr}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAcceptedTerms(v);
                  setAcceptedPrivacy(v);
                  setAcceptedGdpr(v);
                }}
                className="mt-0.5"
              />
              Aceito os termos, política de privacidade e consentimento LGPD.
            </label>

            {errors.general && (
              <p className="text-red-400 text-sm">{errors.general[0]}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              Criar conta da farmácia
            </button>

            <RegisterVerificationNotice lang={lang} />
          </form>
        )}

        <p className="text-center text-slate-500 text-sm mt-8">
          Já tem conta?{" "}
          <Link href={PHARMACY_STORE_LOGIN} className="text-emerald-400 hover:underline inline-flex items-center gap-1">
            <LogIn size={14} /> Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
