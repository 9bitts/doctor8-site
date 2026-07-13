"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { HUMANITARIAN_PATIENT_HOME } from "@/lib/humanitarian/patient-identity";
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
import { Lock } from "lucide-react";
import { ACURA_BRASIL_LOGO_WHITE } from "@/lib/acura-volunteer";
import "./portal.css";
import {
  firstPortalRegisterErrorMessage,
  parseRegisterHumanitarianErrors,
  portalRegisterFieldAnchor,
  validatePortalRegisterForm,
} from "@/lib/humanitarian/portal-register-validation";

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="hum-portal-field-error">{message}</p>;
}

function inputClassFor(fieldErrors: Record<string, string>, ...fields: string[]) {
  const hasError = fields.some((f) => Boolean(fieldErrors[f]));
  return hasError ? "hum-portal-input hum-portal-input-error" : "hum-portal-input";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="hum-portal-section-label">{children}</div>;
}

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="hum-portal-field-label">
      {children}
      {optional && <span style={{ fontWeight: 400, color: "#64748b", fontSize: "0.75rem" }}> (opcional)</span>}
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
    tone === "urgent"
      ? "hum-portal-choice-urgent"
      : tone === "priority"
        ? "hum-portal-choice-priority"
        : "";

  return (
    <label
      className={`hum-portal-choice ${toneClass} ${checked ? "hum-portal-choice-checked" : ""}`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 shrink-0"
        style={{ accentColor: tone === "urgent" ? "#d64545" : tone === "priority" ? "#e08a1f" : "#176a88" }}
      />
      <span className="hum-portal-choice-text">{children}</span>
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const callbackUrl = useMemo(() => HUMANITARIAN_PATIENT_HOME, []);

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

  function clearFieldError(...fields: string[]) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const field of fields) delete next[field];
      return next;
    });
  }

  function applyFieldErrors(errors: Record<string, string>) {
    setFieldErrors(errors);
    setError(firstPortalRegisterErrorMessage(errors));
    const firstKey = Object.keys(errors).find((k) => k !== "_form");
    if (firstKey && typeof window !== "undefined") {
      const anchor = portalRegisterFieldAnchor(firstKey);
      window.requestAnimationFrame(() => {
        document.getElementById(`field-${anchor}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

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
            { fromHumCookie: true, humanitarianPatient: session.user.humanitarianPatient === true },
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
    setFieldErrors({});

    const clientErrors = validatePortalRegisterForm(form);
    if (Object.keys(clientErrors).length > 0) {
      applyFieldErrors(clientErrors);
      return;
    }

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

      const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (!res.ok) {
        const apiErrors = parseRegisterHumanitarianErrors(json);
        if (Object.keys(apiErrors).length > 0) {
          applyFieldErrors(apiErrors);
        } else {
          setError("Não foi possível concluir seu cadastro.");
        }
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
    <div className="hum-portal-page">
      <VenezuelaFlagBackdrop />
      <HumanitarianOriginMarker returnPath={callbackUrl} />

      <div className="hum-portal-wrap">
        <div className="hum-portal-logo-row">
          <BrandLogo variant="on-dark" size="sm" />
          <span className="hum-portal-logo-divider" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ACURA_BRASIL_LOGO_WHITE}
            alt="A Cura Brasil"
            width={140}
            height={36}
            decoding="async"
            className="hum-portal-acura-logo"
          />
        </div>

        <div className="hum-portal-card">
          <div className="flex justify-center mb-3.5 pt-1">
            <span className="hum-portal-badge">
              <span className="hum-portal-badge-dot" />
              SOS Venezuela · Atendimento gratuito
            </span>
          </div>

          <h1 className="hum-portal-title">Atendimento Humanitário</h1>
          <p className="hum-portal-subtitle">
            {mode === "register"
              ? "Preencha os dados abaixo para entrar na triagem e acompanhar seu atendimento."
              : "Entre com seu e-mail e senha para continuar no painel humanitário."}
          </p>

          <div className="hum-portal-tabs">
            {(["register", "login"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setMode(tab); setError(""); }}
                className={`hum-portal-tab ${mode === tab ? "hum-portal-tab-active" : ""}`}
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
            <div className="hum-portal-error-banner" role="alert">
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
                  className="hum-portal-input"
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
                    className="hum-portal-input pr-[4.5rem]"
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
                className="hum-portal-submit"
              >
                {loading ? "Entrando..." : "Entrar no painel"}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <SectionLabel>Seus dados</SectionLabel>

              <div className="mb-4" id="field-fullName">
                <FieldLabel>Nome completo</FieldLabel>
                <input
                  value={form.fullName}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, fullName: e.target.value }));
                    clearFieldError("fullName");
                  }}
                  placeholder="Seu nome completo"
                  className={inputClassFor(fieldErrors, "fullName")}
                  required
                />
                <FieldError message={fieldErrors.fullName} />
              </div>

              <div className="mb-4" id="field-email">
                <FieldLabel>
                  E-mail <span className="font-normal text-[#64748b] text-xs">(para recuperar senha)</span>
                </FieldLabel>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    clearFieldError("email");
                  }}
                  placeholder="seu@email.com"
                  className={inputClassFor(fieldErrors, "email")}
                  required
                  autoComplete="email"
                />
                <FieldError message={fieldErrors.email} />
              </div>

              <div className="mb-4" id="field-phone">
                <FieldLabel>WhatsApp</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-[0.7fr_0.7fr_1.6fr] gap-2.5">
                  <input
                    value={form.phoneDdi}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phoneDdi: e.target.value.replace(/\D/g, "").slice(0, 4) }));
                      clearFieldError("phoneDdi", "phoneNumber");
                    }}
                    placeholder="DDI"
                    className={inputClassFor(fieldErrors, "phoneDdi", "phoneNumber")}
                    inputMode="numeric"
                    required
                  />
                  <input
                    value={form.phoneDdd}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phoneDdd: e.target.value.replace(/\D/g, "").slice(0, 3) }));
                      clearFieldError("phoneDdd", "phoneNumber");
                    }}
                    placeholder="DDD"
                    className={inputClassFor(fieldErrors, "phoneDdd", "phoneNumber")}
                    inputMode="numeric"
                    required
                  />
                  <input
                    value={form.phoneNumber}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 15) }));
                      clearFieldError("phoneNumber");
                    }}
                    placeholder="Número"
                    className={`${inputClassFor(fieldErrors, "phoneNumber")} col-span-2 sm:col-span-1`}
                    inputMode="numeric"
                    required
                  />
                </div>
                <FieldError message={fieldErrors.phoneNumber} />
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
                  className="hum-portal-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div id="field-state">
                  <FieldLabel>Estado</FieldLabel>
                  <input
                    value={form.state}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, state: e.target.value }));
                      clearFieldError("state");
                    }}
                    placeholder="Ex.: Zulia"
                    className={inputClassFor(fieldErrors, "state")}
                    required
                  />
                  <FieldError message={fieldErrors.state} />
                </div>
                <div id="field-city">
                  <FieldLabel>Cidade</FieldLabel>
                  <input
                    value={form.city}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, city: e.target.value }));
                      clearFieldError("city");
                    }}
                    placeholder="Sua cidade"
                    className={inputClassFor(fieldErrors, "city")}
                    required
                  />
                  <FieldError message={fieldErrors.city} />
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

              <div className="mb-4" id="field-description">
                <FieldLabel>Descreva sintomas, lesões ou necessidade de atendimento</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, description: e.target.value }));
                    clearFieldError("description");
                  }}
                  placeholder="Descreva com o máximo de detalhes possível..."
                  className={`${inputClassFor(fieldErrors, "description")} min-h-[76px] resize-y leading-normal`}
                  required
                />
                <FieldError message={fieldErrors.description} />
              </div>

              <div className="mb-4">
                <FieldLabel optional>Informações adicionais</FieldLabel>
                <textarea
                  value={form.additionalInfo}
                  onChange={(e) => setForm((f) => ({ ...f, additionalInfo: e.target.value }))}
                  placeholder="Medicamentos, doenças prévias, etc."
                  className="hum-portal-input min-h-[60px] resize-y leading-normal"
                />
              </div>

              <SectionLabel>Acesso ao painel</SectionLabel>

              <div className="mb-4" id="field-password">
                <FieldLabel>Criar senha</FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, password: e.target.value }));
                      clearFieldError("password");
                    }}
                    placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número e 1 símbolo"
                    className={`${inputClassFor(fieldErrors, "password")} pr-[9.5rem]`}
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
                <FieldError message={fieldErrors.password} />
              </div>

              <div className="flex flex-col gap-2.5 my-5 hum-portal-consent" id="field-consent">
                <label className={`flex items-start gap-2 hum-portal-consent ${fieldErrors.acceptedTelemedicineTcle ? "hum-portal-consent-error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.acceptedTelemedicineTcle}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, acceptedTelemedicineTcle: e.target.checked }));
                      clearFieldError("acceptedTelemedicineTcle");
                    }}
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
                <FieldError message={fieldErrors.acceptedTelemedicineTcle} />
                <label className={`flex items-start gap-2 hum-portal-consent ${fieldErrors.acceptedTerms ? "hum-portal-consent-error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, acceptedTerms: e.target.checked }));
                      clearFieldError("acceptedTerms");
                    }}
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
                <FieldError message={fieldErrors.acceptedTerms} />
                <label className={`flex items-start gap-2 hum-portal-consent ${fieldErrors.acceptedPrivacy ? "hum-portal-consent-error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.acceptedPrivacy}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, acceptedPrivacy: e.target.checked }));
                      clearFieldError("acceptedPrivacy");
                    }}
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
                <FieldError message={fieldErrors.acceptedPrivacy} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="hum-portal-submit"
              >
                {loading ? "Enviando..." : "Enviar e entrar no painel"}
              </button>

              <div className="mt-5 flex justify-center border-t border-[#e6e9ee] pt-4">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                  <Lock size={14} className="text-[#176a88]" aria-hidden />
                  Dados protegidos
                </span>
              </div>
            </form>
          )}
        </div>

        <p className="hum-portal-footnote">
          Doctor8 — Plataforma de Saúde Segura · Teleconsulta com especialistas
        </p>
      </div>
    </div>
  );
}
