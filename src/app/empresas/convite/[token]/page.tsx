"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Brain, Shield, Eye, EyeOff } from "lucide-react";
import { buildLoginHref } from "@/lib/auth-portals";
import InternationalPhoneInput, { type InternationalPhoneValue } from "@/components/InternationalPhoneInput";

export default function WorkforceInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{
    email: string;
    firstName: string;
    companyName: string;
    sessionsPerYear: number;
    alreadyActive: boolean;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState<InternationalPhoneValue>({ ddi: "55", nationalNumber: "" });
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/employer/workforce-accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setInvite(data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/public/employer/workforce-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          phoneDdi: phone.ddi,
          phoneNational: phone.nationalNumber,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acceptedGdpr: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          router.push(buildLoginHref("/login", { callbackUrl: `/empresas/convite/${token}` }));
          return;
        }
        setError(data.error?.general?.[0] || data.error?.email?.[0] || "Erro ao ativar");
        return;
      }
      router.push(data.redirectTo || "/empresas/colaborador");
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <p className="text-slate-600">Convite inválido ou expirado.</p>
      </div>
    );
  }

  if (invite.alreadyActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center space-y-4">
          <Brain className="mx-auto text-sky-600" size={48} />
          <h1 className="text-xl font-bold text-slate-900">Benefício já ativo</h1>
          <Link href="/empresas/colaborador" className="inline-block px-6 py-3 rounded-xl bg-sky-600 text-white font-medium">
            Ir para meu portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-sky-100">
            <Brain className="text-sky-600" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Apoio psicológico (EAP)</h1>
            <p className="text-sm text-slate-500">{invite.companyName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Olá, <strong>{invite.firstName}</strong>! Sua empresa oferece até{" "}
          <strong>{invite.sessionsPerYear}</strong> sessões por ano via Doctor8.
          O atendimento é sigiloso — a empresa não acessa seu prontuário.
        </p>

        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 mb-6">
          <Shield size={16} className="shrink-0 text-sky-600 mt-0.5" />
          <span>Conforme LGPD e CFP: dados clínicos permanecem exclusivamente entre você e o psicólogo.</span>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <input disabled value={invite.email} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <InternationalPhoneInput value={phone} onChange={setPhone} />
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm pr-10"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
            Aceito os termos e autorizo o uso do benefício EAP.
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !accepted} className="w-full py-3 rounded-xl bg-sky-600 text-white font-medium disabled:opacity-50">
            {saving ? "Ativando…" : "Ativar benefício"}
          </button>
        </form>
      </div>
    </div>
  );
}
