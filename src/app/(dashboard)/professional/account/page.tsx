"use client";

// src/app/(dashboard)/professional/account/page.tsx
// Account settings for professionals + seção de Assinatura Digital (BirdID / VIDaaS).

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  Lock, Mail, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, LogOut, Shield, PenLine, Smartphone,
  ChevronDown, ChevronUp, X,
} from "lucide-react";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition";

// ── Assinatura Digital section (self-contained, inline texts) ─────────────────
function DigitalSignSection() {
  const [loading,    setLoading]    = useState(true);
  const [configured, setConfigured] = useState(false);
  const [provider,   setProvider]   = useState<"BirdID" | "VIDaaS" | "">("");
  const [cpfMasked,  setCpfMasked]  = useState("");
  const [editing,    setEditing]    = useState(false);

  // Form state
  const [formProvider, setFormProvider] = useState<"BirdID" | "VIDaaS">("BirdID");
  const [formCpf,      setFormCpf]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState("");
  const [saveOk,       setSaveOk]       = useState(false);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    try {
      const res  = await fetch("/api/professional/digital-sign");
      const data = await res.json();
      setConfigured(data.configured);
      setProvider(data.provider || "");
      setCpfMasked(data.cpfMasked || "");
    } catch { /* ignore */ }
    setLoading(false);
  }

  function formatCpf(v: string): string {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  }

  async function handleSave() {
    setSaveError(""); setSaveOk(false);
    const digits = formCpf.replace(/\D/g, "");
    if (digits.length !== 11) { setSaveError("CPF inválido — digite os 11 dígitos."); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/professional/digital-sign", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider: formProvider, cpf: digits }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Erro ao salvar."); return; }
      setConfigured(true);
      setProvider(data.provider);
      setCpfMasked(data.cpfMasked);
      setSaveOk(true);
      setEditing(false);
      setFormCpf("");
    } catch { setSaveError("Erro de rede."); }
    setSaving(false);
  }

  if (loading) return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3 text-slate-400">
      <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Carregando...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <PenLine size={18} className="text-blue-500" /> Assinatura Digital
        </h2>
        {configured && !editing && (
          <button onClick={() => { setEditing(true); setSaveOk(false); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition">
            Alterar
          </button>
        )}
      </div>

      {/* Status configurado */}
      {configured && !editing && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              {provider} configurado
            </p>
            <p className="text-xs text-blue-600 mt-0.5">CPF: {cpfMasked}</p>
            <p className="text-xs text-slate-500 mt-2">
              Na hora de assinar uma receita, basta abrir o app {provider} no celular,
              copiar o código OTP de 6 dígitos e colar no Doctor8.
            </p>
          </div>
        </div>
      )}

      {/* Não configurado — explicação */}
      {!configured && !editing && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Assine receitas digitalmente com validade ICP-Brasil usando seu certificado
            em nuvem BirdID ou VIDaaS.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* BirdID */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-1">
              <p className="text-sm font-semibold text-slate-800">BirdID</p>
              <p className="text-xs text-slate-500">Soluti · Certificado em nuvem</p>
              <a href="https://birdid.com.br" target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline">birdid.com.br →</a>
            </div>
            {/* VIDaaS */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-1">
              <p className="text-sm font-semibold text-slate-800">VIDaaS</p>
              <p className="text-xs text-slate-500">Valid · Gratuito via CFM</p>
              <a href="https://validcertificadora.com.br" target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline">validcertificadora.com.br →</a>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <Smartphone size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Você precisa ter uma conta ativa no BirdID ou VIDaaS com o app instalado
              no celular antes de configurar aqui.
            </p>
          </div>

          <button onClick={() => setEditing(true)}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
            <PenLine size={14} /> Configurar assinatura digital
          </button>
        </div>
      )}

      {/* Form de cadastro / edição */}
      {editing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Configurar certificado</p>
            <button onClick={() => { setEditing(false); setSaveError(""); setFormCpf(""); }}
              className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          {/* Escolha do provedor */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Provedor</label>
            <div className="grid grid-cols-2 gap-2">
              {(["BirdID", "VIDaaS"] as const).map((p) => (
                <button key={p} onClick={() => setFormProvider(p)}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition ${
                    formProvider === p
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 text-slate-600 hover:border-blue-300"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              CPF cadastrado no {formProvider}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formCpf}
              onChange={(e) => setFormCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Mesmo CPF que você usou para criar sua conta {formProvider}.
            </p>
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={15} /> {saveError}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setEditing(false); setSaveError(""); setFormCpf(""); }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || formCpf.replace(/\D/g,"").length !== 11}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {saveOk && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> Assinatura digital configurada com sucesso!
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfessionalAccountPage() {
  const t = useT();

  const PASSWORD_RULES = [
    { key: "acct.rule8",      test: (p: string) => p.length >= 8 },
    { key: "acct.ruleUpper",  test: (p: string) => /[A-Z]/.test(p) },
    { key: "acct.ruleNumber", test: (p: string) => /[0-9]/.test(p) },
    { key: "acct.ruleSpecial",test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const [currentEmail,  setCurrentEmail]  = useState("");
  const [currentPwd,    setCurrentPwd]    = useState("");
  const [newPwd,        setNewPwd]        = useState("");
  const [confirmPwd,    setConfirmPwd]    = useState("");
  const [showCurrent,   setShowCurrent]   = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [pwdLoading,    setPwdLoading]    = useState(false);
  const [pwdSuccess,    setPwdSuccess]    = useState(false);
  const [pwdError,      setPwdError]      = useState("");
  const [newEmail,      setNewEmail]      = useState("");
  const [emailPwd,      setEmailPwd]      = useState("");
  const [showEmailPwd,  setShowEmailPwd]  = useState(false);
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [emailSuccess,  setEmailSuccess]  = useState(false);
  const [emailError,    setEmailError]    = useState("");

  const isPasswordValid = PASSWORD_RULES.every((r) => r.test(newPwd));
  const passwordsMatch  = newPwd === confirmPwd;

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => { if (s?.user?.email) setCurrentEmail(s.user.email); });
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(""); setPwdSuccess(false);
    if (!isPasswordValid) { setPwdError(t("acct.errPwdReq")); return; }
    if (!passwordsMatch)  { setPwdError(t("acct.pwdNoMatch")); return; }
    setPwdLoading(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(typeof data.error === "string" ? data.error : t("acct.errPwdFail")); return; }
      setPwdSuccess(true); setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 5000);
    } catch { setPwdError(t("acct.errGeneric")); }
    finally { setPwdLoading(false); }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(""); setEmailSuccess(false);
    if (!newEmail) { setEmailError(t("acct.errEnterEmail")); return; }
    setEmailLoading(true);
    try {
      const res  = await fetch("/api/auth/change-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ newEmail, currentPassword: emailPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(typeof data.error === "string" ? data.error : t("acct.errEmailFail")); return; }
      setEmailSuccess(true); setNewEmail(""); setEmailPwd("");
    } catch { setEmailError(t("acct.errGeneric")); }
    finally { setEmailLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("acct.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("acct.subtitle")}</p>
      </div>

      {/* Email atual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Shield size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{currentEmail || t("common.loading")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.currentEmail")}</p>
        </div>
      </div>

      {/* ── ASSINATURA DIGITAL ── */}
      <DigitalSignSection />

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Lock size={18} className="text-emerald-500" /> {t("acct.changePassword")}
        </h2>
        {pwdSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} /> {t("acct.pwdSuccess")}
          </div>
        )}
        {pwdError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} /> {pwdError}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.currentPwd")}</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.newPwd")}</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {newPwd && (
              <div className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <div key={rule.key} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={rule.test(newPwd) ? "text-emerald-500" : "text-slate-300"} />
                    <span className={`text-xs ${rule.test(newPwd) ? "text-emerald-600" : "text-slate-400"}`}>{t(rule.key)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.confirmPwd")}</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required className={inputClass} />
            {confirmPwd && !passwordsMatch && <p className="text-xs text-red-500 mt-1">{t("acct.pwdNoMatch")}</p>}
          </div>
          <button type="submit" disabled={pwdLoading || !isPasswordValid || !passwordsMatch || !currentPwd}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
            {pwdLoading && <Loader2 size={15} className="animate-spin" />}
            {pwdLoading ? t("acct.saving") : t("acct.changePasswordBtn")}
          </button>
        </form>
      </div>

      {/* Alterar email */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Mail size={18} className="text-emerald-500" /> {t("acct.changeEmail")}
        </h2>
        {emailSuccess ? (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">{t("acct.emailSentTitle")}</p>
              <p className="text-xs text-emerald-600 mt-1">{t("acct.emailSentText")}</p>
            </div>
          </div>
        ) : (
          <>
            {emailError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertCircle size={16} /> {emailError}
              </div>
            )}
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.newEmail")}</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className={inputClass} placeholder="new@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.confirmWithPwd")}</label>
                <div className="relative">
                  <input type={showEmailPwd ? "text" : "password"} value={emailPwd} onChange={(e) => setEmailPwd(e.target.value)} required className={inputClass + " pr-12"} />
                  <button type="button" onClick={() => setShowEmailPwd(!showEmailPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showEmailPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={emailLoading || !newEmail}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
                {emailLoading && <Loader2 size={15} className="animate-spin" />}
                {emailLoading ? t("acct.sending") : t("acct.sendVerification")}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("acct.signOut")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.signOutDesc")}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition">
          <LogOut size={15} /> {t("acct.signOut")}
        </button>
      </div>
    </div>
  );
}
