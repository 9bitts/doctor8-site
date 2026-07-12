"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Stethoscope, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { buildLoginHref } from "@/lib/auth-portals";
import { OCCUPATIONAL_PHYSICIAN_HOME, OCCUPATIONAL_PHYSICIAN_LOGIN } from "@/lib/occupational-physician-portal";
import InternationalPhoneInput, { type InternationalPhoneValue } from "@/components/InternationalPhoneInput";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function RegisterOccupationalPhysicianPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const loginHref = buildLoginHref(OCCUPATIONAL_PHYSICIAN_LOGIN, {
    callbackUrl: OCCUPATIONAL_PHYSICIAN_HOME,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{
    email: string;
    fullName: string | null;
    crm: string | null;
    companyName: string;
  } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState<InternationalPhoneValue>({ ddi: "55", nationalNumber: "" });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/validate-employer-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "physician", token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.email) {
          setInvite(data);
          if (data.fullName) {
            const parts = data.fullName.split(" ");
            setFirstName(parts[0] ?? "");
            setLastName(parts.slice(1).join(" "));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy || !acceptedLgpd) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register-occupational-physician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
          password,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acceptedLgpd: true,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(data.error?.email?.[0] || "Conta existente.");
        if (data.acceptUrl) {
          setTimeout(() => router.push(data.acceptUrl), 2000);
        }
        return;
      }
      if (!res.ok) {
        setError(data.error?.general?.[0] || data.error?.email?.[0] || "Erro ao criar conta");
        return;
      }
      router.push(buildLoginHref(OCCUPATIONAL_PHYSICIAN_LOGIN, {
        callbackUrl: OCCUPATIONAL_PHYSICIAN_HOME,
        registered: true,
      }));
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-teal-400" size={32} />
      </div>
    );
  }

  if (!token || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={40} />
          <h1 className="text-white font-semibold text-lg mb-2">Convite inválido ou expirado</h1>
          <Link href={loginHref} className="text-teal-400 text-sm hover:underline">Ir para login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href={loginHref} className="inline-flex items-center gap-2 text-teal-300 text-sm mb-6 hover:text-white">
          <ArrowLeft size={16} /> Voltar ao login
        </Link>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-teal-100">
              <Stethoscope className="text-teal-700" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Médico do trabalho</h1>
              <p className="text-sm text-slate-500">{invite.companyName}{invite.crm ? ` · CRM ${invite.crm}` : ""}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-500">E-mail</label>
              <input disabled value={invite.email} className="w-full mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sobrenome" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <InternationalPhoneInput lang={lang} region="BR" value={phone} onChange={setPhone} />
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={acceptedTerms && acceptedPrivacy && acceptedLgpd} onChange={(e) => { setAcceptedTerms(e.target.checked); setAcceptedPrivacy(e.target.checked); setAcceptedLgpd(e.target.checked); }} className="mt-0.5" />
              Aceito os termos de uso, política de privacidade e consentimento LGPD.
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-teal-600 text-white font-medium disabled:opacity-50">
              {saving ? "Criando conta…" : "Criar conta médico PCMSO"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
