"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Brain, Calendar, Loader2 } from "lucide-react";

type Company = {
  linkId: string;
  companyId: string;
  companyName: string;
  repassePercent: number;
  status: string;
};

type Session = {
  id: string;
  scheduledAt: string;
  status: string;
  patientName: string;
  companyName: string;
};

export default function PsychologistEmpresasPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({
    activeCompanies: 0,
    completedEapSessionsYear: 0,
    upcomingEapCount: 0,
  });

  useEffect(() => {
    fetch("/api/psychologist/empresas")
      .then((r) => r.json())
      .then((data) => {
        if (data.companies) {
          setCompanies(data.companies);
          setSessions(data.upcomingSessions ?? []);
          setStats(data.stats ?? stats);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-violet-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EAP corporativo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Empresas que credenciaram você na rede Doctor8 Empresas — atendimentos sem cobrança ao colaborador.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-2xl font-bold text-violet-900">{stats.activeCompanies}</p>
          <p className="text-xs text-violet-700">Empresas ativas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{stats.completedEapSessionsYear}</p>
          <p className="text-xs text-slate-500">Sessões EAP concluídas (ano)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{stats.upcomingEapCount}</p>
          <p className="text-xs text-slate-500">Próximas sessões EAP</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Building2 size={18} className="text-violet-600" />
          Rede credenciada
        </h2>
        {companies.length === 0 ? (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 p-6 text-center">
            Nenhuma empresa vinculada ainda. O RH credencia você em Doctor8 Empresas → Rede EAP.
          </p>
        ) : (
          <ul className="space-y-2">
            {companies.map((c) => (
              <li
                key={c.linkId}
                className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.companyName}</p>
                  <p className="text-xs text-slate-500">
                    Repasse {c.repassePercent}% · {c.status === "ACTIVE" ? "Ativo" : c.status}
                  </p>
                </div>
                <Brain className="text-violet-400 shrink-0" size={20} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Calendar size={18} className="text-violet-600" />
            Próximas sessões EAP
          </h2>
          <Link href="/psychologist/appointments" className="text-sm text-violet-600 hover:underline">
            Ver agenda completa
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma sessão EAP agendada.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-medium text-slate-900">{s.patientName}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {new Date(s.scheduledAt).toLocaleString("pt-BR")} · {s.companyName}
                </p>
                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                  EAP corporativo
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
