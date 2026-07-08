"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Brain, Calendar, Shield } from "lucide-react";
import { buildLoginHref } from "@/lib/auth-portals";
import WellnessPulseCard from "@/components/employer/WellnessPulseCard";
import PsychoedTrailsCard from "@/components/employer/PsychoedTrailsCard";

type Benefit = {
  companyName: string;
  companySlug: string;
  firstName: string;
  sessionsQuota: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  eapEnabled: boolean;
  bookUrl: string;
};

export default function ColaboradorPortalPage() {
  const [loading, setLoading] = useState(true);
  const [benefit, setBenefit] = useState<Benefit | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/workforce/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(r.status === 401 ? "login" : "none");
          return;
        }
        setBenefit(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  if (error === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4">
          <p className="text-slate-600">Faça login para acessar seu benefício EAP.</p>
          <Link
            href={buildLoginHref("/login", { callbackUrl: "/empresas/colaborador" })}
            className="inline-block px-6 py-3 rounded-xl bg-sky-600 text-white font-medium"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  if (!benefit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <p className="text-slate-600">Nenhum benefício EAP ativo encontrado para sua conta.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="text-sky-600" size={24} />
            <span className="font-semibold text-slate-900">Doctor8 · Benefício EAP</span>
          </div>
          <Link href="/patient" className="text-sm text-sky-600 hover:underline">Portal paciente</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {benefit.firstName}</h1>
          <p className="text-slate-500 text-sm mt-1">Benefício oferecido por {benefit.companyName}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Cota anual</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{benefit.sessionsQuota}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Utilizadas</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{benefit.sessionsUsed}</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-xs text-sky-700 uppercase tracking-wide">Restantes</p>
            <p className="text-3xl font-bold text-sky-800 mt-1">{benefit.sessionsRemaining}</p>
          </div>
        </div>

        <WellnessPulseCard companySlug={benefit.companySlug} />
        <PsychoedTrailsCard />

        {benefit.eapEnabled && benefit.sessionsRemaining > 0 ? (
          <Link
            href={benefit.bookUrl}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-sky-600 text-white font-semibold hover:bg-sky-500 transition"
          >
            <Calendar size={20} />
            Agendar sessão com psicólogo
          </Link>
        ) : (
          <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            {!benefit.eapEnabled
              ? "O benefício EAP está temporariamente indisponível. Entre em contato com o RH."
              : "Você utilizou todas as sessões disponíveis neste período."}
          </p>
        )}

        <div className="flex items-start gap-3 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-5">
          <Shield className="shrink-0 text-sky-600" size={20} />
          <p>
            Seu atendimento psicológico é confidencial. A empresa recebe apenas estatísticas agregadas
            (ex.: número de sessões utilizadas), nunca o conteúdo das consultas.
          </p>
        </div>
      </main>
    </div>
  );
}
