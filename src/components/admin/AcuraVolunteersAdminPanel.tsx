"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, RefreshCw, Users, Clock, Stethoscope, Brain, Leaf } from "lucide-react";
import { ACURA_VOLUNTEER_LOGO } from "@/lib/acura-volunteer";
import type { AcuraVolunteerStats } from "@/lib/acura-volunteer-stats";

const KIND_LABEL: Record<string, string> = {
  professional: "Profissional de saude",
  psychoanalyst: "Psicanalista",
  integrative: "Terapeuta integrativo",
};

const KIND_ICON: Record<string, React.ReactNode> = {
  professional: <Stethoscope size={12} />,
  psychoanalyst: <Brain size={12} />,
  integrative: <Leaf size={12} />,
};

export default function AcuraVolunteersAdminPanel() {
  const [stats, setStats] = useState<AcuraVolunteerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/acura-volunteers");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Image
            src={ACURA_VOLUNTEER_LOGO}
            alt="AcuraBrasil"
            width={96}
            height={24}
            className="h-6 w-auto object-contain"
            unoptimized
          />
          <div>
            <h2 className="font-semibold text-slate-800">Voluntarios AcuraBrasil</h2>
            <p className="text-xs text-slate-500">Opt-in no perfil (selo em consultas e link publico)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {loading && !stats ? (
        <div className="p-8 flex justify-center">
          <Loader2 size={22} className="animate-spin text-sky-500" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-50">
            <div className="bg-sky-50 rounded-xl p-3">
              <p className="text-xs text-sky-700 flex items-center gap-1">
                <Users size={12} /> Com selo ativo
              </p>
              <p className="text-2xl font-bold text-sky-900 mt-1">{stats.totals.optInVerified}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <Clock size={12} /> Aguardando verificacao
              </p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{stats.totals.optInPending}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 col-span-2">
              <p className="text-xs text-slate-500 mb-2">Por tipo (verificados)</p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                <span>Saude: <strong>{stats.totals.byKind.professional}</strong></span>
                <span>Psicanalista: <strong>{stats.totals.byKind.psychoanalyst}</strong></span>
                <span>Integrativo: <strong>{stats.totals.byKind.integrative}</strong></span>
              </div>
            </div>
          </div>

          {stats.volunteers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Nenhum opt-in registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2.5">Nome</th>
                    <th className="px-5 py-2.5">Tipo</th>
                    <th className="px-5 py-2.5">Especialidade</th>
                    <th className="px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.volunteers.map((v) => (
                    <tr key={`${v.kind}-${v.id}`} className="border-b border-slate-50">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-slate-800">{v.name}</p>
                        {v.email && <p className="text-xs text-slate-400 truncate max-w-[200px]">{v.email}</p>}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          {KIND_ICON[v.kind]} {KIND_LABEL[v.kind]}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-slate-600 text-xs">{v.specialty || "?"}</td>
                      <td className="px-5 py-2.5">
                        {v.verified ? (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Selo visivel
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pendente verificacao
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
