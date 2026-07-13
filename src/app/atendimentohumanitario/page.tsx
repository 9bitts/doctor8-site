"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { buildForgotPasswordHref, PATIENT_LOGIN } from "@/lib/auth-portals";

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
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const callbackUrl = useMemo(
    () => `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`,
    [],
  );

  const forgotHref = useMemo(
    () =>
      buildForgotPasswordHref({
        email: form.email.trim().toLowerCase() || undefined,
        from: PATIENT_LOGIN,
      }),
    [form.email],
  );

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
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

      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        const msg =
          json?.error?.fieldErrors
            ? "Verifique os campos e tente novamente."
            : json?.error || "Não foi possível concluir seu cadastro.";
        setError(msg);
        setLoading(false);
        return;
      }

      // Ensure clean session on shared devices
      await signOut({ redirect: false });

      const signInResult = await signIn("credentials", {
        email: payload.email,
        password: form.password,
        callbackUrl,
        redirect: false,
      });

      if (!signInResult?.ok) {
        setError("Seu cadastro foi criado, mas não foi possível entrar automaticamente. Faça login.");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Atendimento Humanitário
          </h1>
          <p className="text-slate-300 mt-2">
            Preencha os dados abaixo para entrar na triagem e acompanhar seu atendimento.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <p className="text-slate-300 text-sm">
              Já tem conta?
              {" "}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-emerald-300 hover:text-emerald-200 font-semibold"
              >
                Entrar
              </Link>
            </p>
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

          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Label>Nome completo</Label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <Label>WhatsApp — DDI</Label>
                <input
                  value={form.phoneDdi}
                  onChange={(e) => setForm((f) => ({ ...f, phoneDdi: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  inputMode="numeric"
                  required
                />
              </div>
              <div>
                <Label>WhatsApp — DDD</Label>
                <input
                  value={form.phoneDdd}
                  onChange={(e) => setForm((f) => ({ ...f, phoneDdd: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                />
              </div>

              <div>
                <Label>Estado</Label>
                <input
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  required
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                  className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Informações adicionais (opcional)</Label>
                <textarea
                  value={form.additionalInfo}
                  onChange={(e) => setForm((f) => ({ ...f, additionalInfo: e.target.value }))}
                  placeholder="Medicamentos, doenças prévias, etc."
                  className="w-full min-h-[90px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
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
                    className="px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-100 text-sm disabled:opacity-50"
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
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition"
            >
              {loading ? "Enviando..." : "Enviar e entrar no painel"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

