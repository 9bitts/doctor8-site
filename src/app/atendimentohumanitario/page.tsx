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

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-200 mb-2">{children}</label>;
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
      if (session?.user?.id) router.replace(callbackUrl);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 py-10">
      <VenezuelaFlagBackdrop />
      <HumanitarianOriginMarker returnPath={callbackUrl} />

      <div className="w-full max-w-2xl relative z-10">
        <div className="mb-6 text-center sm:text-left">
          <div className="flex justify-center sm:justify-start mb-4">
            <BrandLogo variant="on-dark" size="sm" />
          </div>
          <p className="text-amber-200/90 text-xs font-semibold uppercase tracking-widest mb-2">
            SOS Venezuela · Atendimento gratuito
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
            Atendimento Humanitário
          </h1>
          <p className="text-slate-200/90 mt-2 max-w-xl">
            {mode === "register"
              ? "Preencha os dados abaixo para entrar na triagem e acompanhar seu atendimento."
              : "Entre com seu e-mail e senha para continuar no painel humanitário."}
          </p>
        </div>

        <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/30">
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Criar conta
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Entrar
            </button>
          </div>

          <div className="flex justify-end mb-4">
            <Link
              href={forgotHref}
              className="text-slate-300 hover:text-white text-sm underline underline-offset-4"
            >
              Esqueci minha senha
            </Link>
          </div>

          {error && (
            <div
              className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={onLogin} className="space-y-5" noValidate>
              <div>
                <Label>E-mail</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label>Senha</Label>
                <div className="flex gap-3">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-sm shrink-0"
                  >
                    {showLoginPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold transition"
              >
                {loading ? "Entrando..." : "Entrar no painel"}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Label>Nome completo</Label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>E-mail (para recuperar senha)</Label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Label>WhatsApp — DDI</Label>
                  <input
                    value={form.phoneDdi}
                    onChange={(e) => setForm((f) => ({ ...f, phoneDdi: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div>
                  <Label>WhatsApp — DDD</Label>
                  <input
                    value={form.phoneDdd}
                    onChange={(e) => setForm((f) => ({ ...f, phoneDdd: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>WhatsApp — Número</Label>
                  <input
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
                    placeholder="Somente números"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    inputMode="numeric"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Relação com o paciente</Label>
                  <select
                    value={form.relationship}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, relationship: e.target.value as FormState["relationship"] }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    <option className="bg-slate-950" value="Sou o paciente">Sou o paciente</option>
                    <option className="bg-slate-950" value="Sou familiar ou responsável">Sou familiar ou responsável</option>
                    <option className="bg-slate-950" value="Outra pessoa solicita ajuda">Outra pessoa solicita ajuda</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label>Idade do paciente (opcional)</Label>
                  <input
                    value={form.patientAgeOrDob}
                    onChange={(e) => setForm((f) => ({ ...f, patientAgeOrDob: e.target.value.slice(0, 50) }))}
                    placeholder="Ex.: 32"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>

                <div>
                  <Label>Estado</Label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Tipo de atendimento solicitado</Label>
                  <select
                    value={form.serviceRequested}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, serviceRequested: e.target.value as FormState["serviceRequested"] }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    {[
                      "Atendimento médico",
                      "Atendimento psicológico",
                      "Médico e psicológico",
                      "Psicanálise",
                      "Terapias integrativas",
                      "Não tenho certeza — preciso de orientação",
                    ].map((v) => (
                      <option className="bg-slate-950" key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label>Urgência percebida</Label>
                  <select
                    value={form.urgency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, urgency: e.target.value as FormState["urgency"] }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  >
                    {[
                      "Emergência — risco de vida ou trauma grave",
                      "Alta prioridade — dor intensa, crise emocional aguda",
                      "Atendimento regular",
                    ].map((v) => (
                      <option className="bg-slate-950" key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label>Descreva sintomas, lesões ou necessidade de atendimento</Label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva com o máximo de detalhes possível..."
                    className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Informações adicionais (opcional)</Label>
                  <textarea
                    value={form.additionalInfo}
                    onChange={(e) => setForm((f) => ({ ...f, additionalInfo: e.target.value }))}
                    placeholder="Medicamentos, doenças prévias, etc."
                    className="w-full min-h-[90px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Criar senha</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número e 1 símbolo"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-sm"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                    <button
                      type="button"
                      onClick={copyPassword}
                      disabled={!form.password}
                      className="px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15 text-amber-100 text-sm disabled:opacity-50"
                    >
                      {copied ? "Copiado" : "Copiar senha"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.acceptedTelemedicineTcle}
                    onChange={(e) => setForm((f) => ({ ...f, acceptedTelemedicineTcle: e.target.checked }))}
                    className="mt-1"
                    required
                  />
                  <span>
                    Eu aceito o <strong>TCLE — Consentimento para telesconsulta (Doctor8)</strong>.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(e) => setForm((f) => ({ ...f, acceptedTerms: e.target.checked }))}
                    className="mt-1"
                    required
                  />
                  <span>Eu aceito os Termos de uso.</span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.acceptedPrivacy}
                    onChange={(e) => setForm((f) => ({ ...f, acceptedPrivacy: e.target.checked }))}
                    className="mt-1"
                    required
                  />
                  <span>Eu aceito a Política de privacidade.</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold transition"
              >
                {loading ? "Enviando..." : "Enviar e entrar no painel"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
