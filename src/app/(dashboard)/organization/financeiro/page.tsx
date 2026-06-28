"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(cents / 100);
}

type ProfSummary = {
  professionalId: string;
  name: string;
  grossCents: number;
  professionalCents: number;
  clinicCents: number;
  count: number;
  repassePercent: number;
};

export default function OrganizationFinanceiroPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");
  const [currency, setCurrency] = useState("BRL");
  const [totalGross, setTotalGross] = useState(0);
  const [totalClinic, setTotalClinic] = useState(0);
  const [totalProfessional, setTotalProfessional] = useState(0);
  const [byProfessional, setByProfessional] = useState<ProfSummary[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/organization/financeiro?period=${period}`);
      const data = await res.json();
      if (res.ok) {
        setCurrency(data.currency);
        setTotalGross(data.totalGrossCents);
        setTotalClinic(data.totalClinicCents);
        setTotalProfessional(data.totalProfessionalCents);
        setByProfessional(data.byProfessional || []);
      }
      setLoading(false);
    }
    load();
  }, [period]);

  const periods = [
    { value: "this_month", label: "Este mês" },
    { value: "last_month", label: "Mês passado" },
    { value: "3_months", label: "3 meses" },
    { value: "this_year", label: "Este ano" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500 text-sm mt-1">Receitas e repasses por profissional</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Receita bruta", value: fmt(totalGross, currency), color: "text-slate-900" },
              { label: "Repasse profissionais", value: fmt(totalProfessional, currency), color: "text-violet-600" },
              { label: "Receita da clínica", value: fmt(totalClinic, currency), color: "text-indigo-600" },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-slate-400" />
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Por profissional</h2>
            {byProfessional.length === 0 ? (
              <p className="text-slate-400 text-sm">Sem receitas no período.</p>
            ) : (
              <div className="space-y-3">
                {byProfessional.map((p) => (
                  <div key={p.professionalId} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.count} consulta{p.count !== 1 ? "s" : ""} · repasse {p.repassePercent}%
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-violet-600 font-medium">{fmt(p.professionalCents, currency)}</p>
                      <p className="text-slate-400 text-xs">Clínica: {fmt(p.clinicCents, currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
