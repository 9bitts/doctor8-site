"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { buildForgotPasswordHref } from "@/lib/auth-portals";
import { consumeAuthCallback, persistAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { safePostLoginUrl } from "@/lib/role-home";
import { syncHumanitarianOriginFromCallback } from "@/lib/humanitarian/origin-cookie";
import {
  navigateAfterAuth,
  resolveCredentialSignInError,
  waitForAuthenticatedSession,
} from "@/components/auth/login-shared";
import HumanitarianOriginMarker from "@/components/humanitarian/HumanitarianOriginMarker";
import VenezuelaFlagBackdrop from "@/components/humanitarian/VenezuelaFlagBackdrop";
import { BrandLogo } from "@/components/brand/BrandLogo";

type PortalMode = "register" | "login";

type FormState = {
  fullName: string;
  email: string;
  phoneDdi: string;
  phoneDdd: string;
  phoneNumber: string;
  relationship: "Sou o paciente" | "Sou familiar ou responsável" | "Outra pessoa solicita ajuda";
  patientAgeOrDob: string;
  state: string;
  city: string;
  serviceRequested:
    | "Atendimento médico"
    | "Atendimento psicológico"
    | "Médico e psicológico"
    | "Psicanálise"
    | "Terapias integrativas"
    | "Não tenho certeza — preciso de orientação";
  urgency:
    | "Emergência — risco de vida ou trauma grave"
    | "Alta prioridade — dor intensa, crise emocional aguda"
    | "Atendimento regular";
  description: string;
  additionalInfo: string;
  password: string;
  acceptedTelemedicineTcle: boolean;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

const initial: FormState = {
  fullName: "",
  email: "",
  phoneDdi: "58",
  phoneDdd: "",
  phoneNumber: "",
  relationship: "Sou o paciente",
  patientAgeOrDob: "",
  state: "",
  city: "",
  serviceRequested: "Não tenho certeza — preciso de orientação",
  urgency: "Atendimento regular",
  description: "",
  additionalInfo: "",
  password: "",
  acceptedTelemedicineTcle: false,
  acceptedTerms: false,
  acceptedPrivacy: false,
};

const RELATIONSHIP_OPTIONS: FormState["relationship"][] = [
  "Sou o paciente",
  "Sou familiar ou responsável",
  "Outra pessoa solicita ajuda",
];

const SERVICE_OPTIONS: FormState["serviceRequested"][] = [
  "Atendimento médico",
  "Atendimento psicológico",
  "Médico e psicológico",
  "Psicanálise",
  "Terapias integrativas",
  "Não tenho certeza — preciso de orientação",
];

const URGENCY_OPTIONS: {
  value: FormState["urgency"];
  label: string;
  hint?: string;
  tag?: { text: string; tone: "danger" | "warn" };
  tone?: "urgent" | "priority";
}[] = [
  {
    value: "Emergência — risco de vida ou trauma grave",
    label: "Emergência",
    hint: "Trauma grave ou risco imediato",
    tag: { text: "Risco de vida", tone: "danger" },
    tone: "urgent",
  },
  {
    value: "Alta prioridade — dor intensa, crise emocional aguda",
    label: "Alta prioridade",
    hint: "Dor intensa ou crise emocional aguda",
    tag: { text: "Atenção rápida", tone: "warn" },
    tone: "priority",
  },
  {
    value: "Atendimento regular",
    label: "Atendimento regular",
  },
];

const inputClass =
  "w-full px-3.5 py-3 border-[1.5px] border-[#e6e9ee] rounded-xl text-sm text-[#1b2733] bg-[#fbfcfd] placeholder:text-[#9aa5b1] focus:outline-none focus:border-[#1c86ab] focus:bg-white focus:ring-4 focus:ring-[#1c86ab]/12 transition";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3 first:mt-0">
      <span className="text-xs font-bold uppercase tracking-wider text-[#125e7c] shrink-0">
        {children}
      </span>
      <span className="flex-1 h-px bg-gradient-to-r from-[#e6e9ee] to-transparent" />
    </div>
  );
}

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block text-[13px] font-semibold text-[#3a4652] mb-1.5">
      {children}
      {optional && <span className="font-normal text-[#64748b] text-xs ml-1">(opcional)</span>}
    </label>
  );
}

function RadioChoice({
  checked,
  onSelect,
  children,
  tone,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  tone?: "urgent" | "priority";
}) {
  const toneClass =
    tone === "urgent" && checked
      ? "border-[#d64545] bg-[#d64545]/[0.06] shadow-[0_0_0_3px_rgba(214,69,69,0.08)]"
      : tone === "priority" && checked
        ? "border-[#e08a1f] bg-[#e08a1f]/[0.07] shadow-[0_0_0_3px_rgba(224,138,31,0.08)]"
        : checked
          ? "border-[#1c86ab] bg-[#1c86ab]/[0.06] shadow-[0_0_0_3px_rgba(23,106,136,0.08)]"
          : "border-[#e6e9ee] bg-[#fbfcfd] hover:border-[#c7d3db]";

  return (
    <label
      className={`flex items-start gap-2.5 border-[1.5px] rounded-xl px-3.5 py-2.5 cursor-pointer transition ${toneClass}`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className={`mt-0.5 shrink-0 ${tone === "urgent" ? "accent-[#d64545]" : tone === "priority" ? "accent-[#e08a1f]" : "accent-[#176a88]"}`}
      />
      <span className="text-[13.5px] text-[#1b2733] leading-snug">{children}</span>
    </label>
  );
}

export default function HumanitarianPatientPortalPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PortalMode>("register");
  const [form, setForm] = useState<FormState>(initial);
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const callbackUrl = useMemo(
    () => `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`,
    [],
  );

  const forgotHref = useMemo(
    () =>
      buildForgotPasswordHref({
        email: form.email.trim().toLowerCase() || undefined,
        from: "/atendimentohumanitario",
      }),
    [form.email],
  );

  useEffect(() => {
    syncHumanitarianOriginFromCallback(callbackUrl);
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "login") setMode("login");
  }, [callbackUrl]);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.role === "PATIENT") {
        router.replace(callbackUrl);
      }
    });
  }, [callbackUrl, router]);

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = form.email.trim().toLowerCase();

    try {
      clearSensitiveClientState();
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email: trimmedEmail,
        password: loginPassword,
        callbackUrl,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        const code = resolveCredentialSignInError(result ?? {});
        setError(
          code === "invalid"
            ? "E-mail ou senha incorretos."
            : code === "unverified"
              ? "Confirme seu e-mail antes de entrar."
              : "Não foi possível entrar. Tente novamente.",
        );
        setLoading(false);
        return;
      }

      persistAuthCallback(callbackUrl);
      const session = await waitForAuthenticatedSession({ expectedEmail: trimmedEmail });
      if (session?.user?.role) {
        const savedCallback = consumeAuthCallback();
        navigateAfterAuth(
          safePostLoginUrl(
            session.user.role,
            savedCallback || callbackUrl,
            resolvePatientPostLoginUrl,
            session.user.professionalSpecialty,
            { fromHumCookie: true },
          ),
          session.user.role,
        );
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        campaignSlug: VENEZUELA_CAMPAIGN_SLUG,
        lang: "pt",
      };

      const res = await fetch("/api/auth/register-humanitarian", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as { error?: string | { fieldErrors?: unknown } } | null;
      if (!res.ok) {
        const msg =
          json?.error && typeof json.error === "object" && "fieldErrors" in json.error
            ? "Verifique os campos e tente novamente."
            : (typeof json?.error === "string" ? json.error : "Não foi possível concluir seu cadastro.");
        setError(msg);
        setLoading(false);
        return;
      }

      await signOut({ redirect: false });

      const signInResult = await signIn("credentials", {
        email: payload.email,
        password: form.password,
        callbackUrl,
        redirect: false,
      });

      if (!signInResult?.ok) {
        setError("Seu cadastro foi criado, mas não foi possível entrar automaticamente. Use a aba Entrar.");
        setMode("login");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-start justify-center px-5 py-14">
      <VenezuelaFlagBackdrop />
      <HumanitarianOriginMarker returnPath={callbackUrl} />

      <div className="relative z-10 w-full max-w-[560px]">
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <BrandLogo variant="on-dark" size="sm" />
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-white/[0.97] p-8 sm:p-10 shadow-[0_40px_90px_-20px_rgba(0,0,0,.55),0_12px_30px_-10px_rgba(0,0,0,.4)] backdrop-blur-[18px]">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ background: "linear-gradient(90deg, #FBD108, #00247D, #CF142B)" }}
          />

          <div className="flex justify-center mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d698] bg-gradient-to-br from-[#fdf1da] to-white px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-[#e0940a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#CF142B] shadow-[0_0_0_3px_rgba(207,20,43,.15)]" />
              SOS Venezuela · Atendimento gratuito
            </span>
          </div>

          <h1 className="text-center text-[27px] font-extrabold tracking-tight text-[#0d4a61] mb-2">
            Atendimento Humanitário
          </h1>
          <p className="text-center text-[14.5px] leading-relaxed text-[#64748b] mb-6 px-2">
            {mode === "register"
              ? "Preencha os dados abaixo para entrar na triagem e acompanhar seu atendimento."
              : "Entre com seu e-mail e senha para continuar no painel humanitário."}
          </p>

          <div className="flex gap-1 rounded-[14px] bg-[#f1f4f7] p-1 mb-7">
            {(["register", "login"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setMode(tab); setError(""); }}
                className={`flex-1 rounded-[11px] py-2.5 text-[13.5px] font-semibold transition ${
                  mode === tab
                    ? "bg-gradient-to-br from-[#176a88] to-[#0d4a61] text-white shadow-[0_8px_18px_-6px_rgba(23,106,136,.55)]"
                    : "text-[#64748b] hover:text-[#1b2733]"
                }`}
              >
                {tab === "register" ? "Criar conta" : "Entrar"}
              </button>
            ))}
          </div>

          {mode === "login" && (
            <div className="flex justify-end mb-4 -mt-2">
              <Link
                href={forgotHref}
                className="text-xs font-semibold text-[#125e7c] hover:underline underline-offset-2"
              >
                Esqueci minha senha
              </Link>
            </div>
          )}

          {error && (
            <div
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={onLogin} className="space-y-4" noValidate>
              <div>
                <FieldLabel>E-mail</FieldLabel>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className={inputClass}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <FieldLabel>Senha</FieldLabel>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className={`${inputClass} pr-[4.5rem]`}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[#eef2f5] px-2.5 py-1.5 text-[11px] font-semibold text-[#125e7c] hover:bg-[#e2e8ec]"
                  >
                    {showLoginPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-[14px] border-none py-[15px] text-[15px] font-bold text-[#3a2405] disabled:opacity-50 transition hover:-translate-y-px active:translate-y-0"
                style={{
                  background: "linear-gradient(135deg, #ffd257, #f2a71b 55%, #e0940a)",
                  boxShadow: "0 16px 30px -10px rgba(224,148,10,.55), inset 0 1px 0 rgba(255,255,255,.5)",
                }}
              >
                {loading ? "Entrando..." : "Entrar no painel"}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <SectionLabel>Seus dados</SectionLabel>

              <div className="mb-4">
                <FieldLabel>Nome completo</FieldLabel>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Seu nome completo"
                  className={inputClass}
                  required
                />
              </div>

              <div className="mb-4">
                <FieldLabel>
                  E-mail <span className="font-normal text-[#64748b] text-xs">(para recuperar senha)</span>
                </FieldLabel>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className={inputClass}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="mb-4">
                <FieldLabel>WhatsApp</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-[0.7fr_0.7fr_1.6fr] gap-2.5">
                  <input
                    value={form.phoneDdi}
                    onChange={(e) => setForm((f) => ({ ...f, phoneDdi: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    placeholder="DDI"
                    className={inputClass}
                    inputMode="numeric"
                    required
                  />
                  <input
                    value={form.phoneDdd}
                    onChange={(e) => setForm((f) => ({ ...f, phoneDdd: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                    placeholder="DDD"
                    className={inputClass}
                    inputMode="numeric"
                    required
                  />
                  <input
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
                    placeholder="Número"
                    className={`${inputClass} col-span-2 sm:col-span-1`}
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>

              <SectionLabel>Relação com o paciente</SectionLabel>
              <div className="flex flex-col gap-2 mb-4">
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <RadioChoice
                    key={opt}
                    checked={form.relationship === opt}
                    onSelect={() => setForm((f) => ({ ...f, relationship: opt }))}
                  >
                    {opt}
                  </RadioChoice>
                ))}
              </div>

              <div className="mb-4">
                <FieldLabel optional>Idade do paciente</FieldLabel>
                <input
                  value={form.patientAgeOrDob}
                  onChange={(e) => setForm((f) => ({ ...f, patientAgeOrDob: e.target.value.slice(0, 50) }))}
                  placeholder="Ex.: 32"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div>
                  <FieldLabel>Estado</FieldLabel>
                  <input
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="UF"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>Cidade</FieldLabel>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Sua cidade"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <SectionLabel>Tipo de atendimento solicitado</SectionLabel>
              <div className="flex flex-col gap-2 mb-4">
                {SERVICE_OPTIONS.map((opt) => (
                  <RadioChoice
                    key={opt}
                    checked={form.serviceRequested === opt}
                    onSelect={() => setForm((f) => ({ ...f, serviceRequested: opt }))}
                  >
                    {opt}
                  </RadioChoice>
                ))}
              </div>

              <SectionLabel>Urgência percebida</SectionLabel>
              <div className="flex flex-col gap-2 mb-4">
                {URGENCY_OPTIONS.map((opt) => (
                  <RadioChoice
                    key={opt.value}
                    checked={form.urgency === opt.value}
                    onSelect={() => setForm((f) => ({ ...f, urgency: opt.value }))}
                    tone={opt.tone}
                  >
                    <>
                      {opt.label}
                      {opt.tag && (
                        <span
                          className={`ml-2 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide align-middle ${
                            opt.tag.tone === "danger"
                              ? "bg-[#fbe6e6] text-[#d64545]"
                              : "bg-[#fdedd6] text-[#e08a1f]"
                          }`}
                        >
                          {opt.tag.text}
                        </span>
                      )}
                      {opt.hint && (
                        <small className="block text-[11.5px] text-[#64748b] mt-0.5">{opt.hint}</small>
                      )}
                    </>
                  </RadioChoice>
                ))}
              </div>

              <SectionLabel>Detalhes do caso</SectionLabel>

              <div className="mb-4">
                <FieldLabel>Descreva sintomas, lesões ou necessidade de atendimento</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva com o máximo de detalhes possível..."
                  className={`${inputClass} min-h-[76px] resize-y leading-normal`}
                  required
                />
              </div>

              <div className="mb-4">
                <FieldLabel optional>Informações adicionais</FieldLabel>
                <textarea
                  value={form.additionalInfo}
                  onChange={(e) => setForm((f) => ({ ...f, additionalInfo: e.target.value }))}
                  placeholder="Medicamentos, doenças prévias, etc."
                  className={`${inputClass} min-h-[60px] resize-y leading-normal`}
                />
              </div>

              <SectionLabel>Acesso ao painel</SectionLabel>

              <div className="mb-4">
                <FieldLabel>Criar senha</FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número e 1 símbolo"
                    className={`${inputClass} pr-[9.5rem]`}
                    required
                    autoComplete="new-password"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-lg bg-[#eef2f5] px-2.5 py-1.5 text-[11px] font-semibold text-[#125e7c] hover:bg-[#e2e8ec]"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                    <button
                      type="button"
                      onClick={copyPassword}
                      disabled={!form.password}
                      className="rounded-lg bg-[#eef2f5] px-2.5 py-1.5 text-[11px] font-semibold text-[#125e7c] hover:bg-[#e2e8ec] disabled:opacity-50"
                    >
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 my-5">
                <label className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#64748b]">
                  <input
                    type="checkbox"
                    checked={form.acceptedTelemedicineTcle}
                    onChange={(e) => setForm((f) => ({ ...f, acceptedTelemedicineTcle: e.target.checked }))}
                    className="mt-0.5 shrink-0 accent-[#176a88]"
                    required
                  />
                  <span>
                    Eu aceito o{" "}
                    <Link href="/terms" target="_blank" className="font-semibold text-[#125e7c] no-underline hover:underline">
                      TCLE — Consentimento para teleconsulta (Doctor8)
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#64748b]">
                  <input
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(e) => setForm((f) => ({ ...f, acceptedTerms: e.target.checked }))}
                    className="mt-0.5 shrink-0 accent-[#176a88]"
                    required
                  />
                  <span>
                    Eu aceito os{" "}
                    <Link href="/terms" target="_blank" className="font-semibold text-[#125e7c] no-underline hover:underline">
                      Termos de uso
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#64748b]">
                  <input
                    type="checkbox"
                    checked={form.acceptedPrivacy}
                    onChange={(e) => setForm((f) => ({ ...f, acceptedPrivacy: e.target.checked }))}
                    className="mt-0.5 shrink-0 accent-[#176a88]"
                    required
                  />
                  <span>
                    Eu aceito a{" "}
                    <Link href="/privacy" target="_blank" className="font-semibold text-[#125e7c] no-underline hover:underline">
                      Política de privacidade
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[14px] border-none py-[15px] text-[15px] font-bold text-[#3a2405] disabled:opacity-50 transition hover:-translate-y-px active:translate-y-0"
                style={{
                  background: "linear-gradient(135deg, #ffd257, #f2a71b 55%, #e0940a)",
                  boxShadow: "0 16px 30px -10px rgba(224,148,10,.55), inset 0 1px 0 rgba(255,255,255,.5)",
                }}
              >
                {loading ? "Enviando..." : "Enviar e entrar no painel"}
              </button>

              <div className="mt-5 flex justify-center gap-4 border-t border-[#e6e9ee] pt-4">
                {["LGPD", "HIPAA", "Dados protegidos"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e7f1f5] text-[10px] text-[#176a88]">
                      ✓
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-white/70">
          Doctor8 — Plataforma de Saúde Segura · Teleconsulta com especialistas
        </p>
      </div>
    </div>
  );
}
