"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart3, TrendingUp, Users, AlertTriangle } from "lucide-react";

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(cents / 100);
}

export default function OrganizationReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");
  const [data, setData] = useState<{
    currency: string;
    overview: {
      totalAppointments: number;
      completedCount: number;
      noShowCount: number;
      completionRate: number;
      noShowRate: number;
      totalRevenueCents: number;
      professionalCount: number;
    };
    byProfessional: { name: string; specialty: string; completed: number; noShow: number; revenueCents: number }[];
    bySpecialty: { specialty: string; count: number; revenueCents: number }[];
    byType: { type: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/organization/reports?period=${period}`);
      const json = await res.json();
      if (res.ok) setData(json);
      setLoading(false);
    }
    load();
  }, [period]);

  const periods = [
    { value: "this_month", label: "Este m\u00eas" },
    { value: "last_month", label: "M\u00eas passado" },
    { value: "3_months", label: "3 meses" },
    { value: "this_year", label: "Este ano" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relat\u00f3rios</h1>
          <p className="text-slate-500 text-sm mt-1">Produtividade e receita da cl\u00ednica</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
          {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: BarChart3, label: "Consultas", value: String(data.overview.totalAppointments), sub: `${data.overview.completionRate}% conclu\u00eddas` },
              { icon: TrendingUp, label: "Receita", value: fmt(data.overview.totalRevenueCents, data.currency), sub: "consultas pagas" },
              { icon: Users, label: "Profissionais", value: String(data.overview.professionalCount), sub: "ativos" },
              { icon: AlertTriangle, label: "No-show", value: `${data.overview.noShowRate}%`, sub: `${data.overview.noShowCount} faltas` },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                <c.icon size={18} className="text-indigo-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                <p className="text-sm text-slate-600">{c.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Por profissional</h2>
              {data.byProfessional.length === 0 ? (
                <p className="text-slate-400 text-sm">Sem dados no per\u00edodo.</p>
              ) : (
                <div className="space-y-3">
                  {data.byProfessional.map((p) => (
                    <div key={p.name} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Dr. {p.name}</p>
                        <p className="text-xs text-slate-500">{p.specialty} \u00b7 {p.completed} atend. \u00b7 {p.noShow} faltas</p>
                      </div>
                      <span className="text-sm font-medium text-indigo-600">{fmt(p.revenueCents, data.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Por especialidade</h2>
              {data.bySpecialty.length === 0 ? (
                <p className="text-slate-400 text-sm">Sem dados no per\u00edodo.</p>
              ) : (
                <div className="space-y-3">
                  {data.bySpecialty.map((s) => (
                    <div key={s.specialty} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.specialty}</p>
                        <p className="text-xs text-slate-500">{s.count} consultas</p>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">{fmt(s.revenueCents, data.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {data.byType.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Por tipo de atendimento</h2>
              <div className="flex gap-6">
                {data.byType.map((t) => (
                  <div key={t.type} className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{t.count}</p>
                    <p className="text-sm text-slate-500">{t.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
