"use client";

import { useEffect, useState } from "react";
import { Loader2, Receipt, Camera } from "lucide-react";

type UsageReport = {
  periodLabel: string;
  sessionsCompleted: number;
  sessionsScheduled: number;
  sessionsQuotaTotal: number;
  utilizationPercent: number;
  estimatedCostCents: number;
  estimatedRepasseCents: number;
  sessionPriceCents: number;
  byMonth: Array<{ month: string; completed: number; estimatedCostCents: number }>;
};

type Snapshot = {
  id: string;
  yearMonth: string;
  sessionsCompleted: number;
  amountCents: number;
  repasseCents: number;
  generatedAt: string;
};

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MeteredBillingNote() {
  const [metered, setMetered] = useState<{
    configured: boolean;
    mode: string;
    sessionsReported: number;
    sessionsInternalDemo: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/employer/billing/metered")
      .then((r) => r.json())
      .then((d) =>
        setMetered({
          configured: d.configured,
          mode: d.mode ?? "demo",
          sessionsReported: d.sessionsReported ?? 0,
          sessionsInternalDemo: d.sessionsInternalDemo ?? 0,
          message: d.message,
        }),
      )
      .catch(() => {});
  }, []);

  if (!metered) return null;

  return (
    <p className={`text-xs border-t border-slate-100 pt-2 ${metered.configured ? "text-emerald-700" : "text-amber-800"}`}>
      {metered.configured
        ? `Cobrança Stripe metered: ${metered.sessionsReported} sessão(ões) reportadas.`
        : `Modo demo: ${metered.sessionsInternalDemo || metered.sessionsReported} sessão(ões) registradas internamente (sem Stripe).`}
    </p>
  );
}

export function EmployerEapUsageSection() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadSnapshots() {
    const res = await fetch("/api/employer/billing/snapshots");
    const data = await res.json();
    if (res.ok) setSnapshots(data.snapshots ?? []);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/employer/billing/usage").then((r) => r.json()),
      fetch("/api/employer/billing/snapshots").then((r) => r.json()),
    ])
      .then(([usageData, snapData]) => {
        setReport(usageData.report ?? null);
        setSnapshots(snapData.snapshots ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function generateSnapshot() {
    setGenerating(true);
    await fetch("/api/employer/billing/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setGenerating(false);
    loadSnapshots();
  }

  if (loading) return <Loader2 className="animate-spin text-slate-400" size={20} />;

  if (!report) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <Receipt size={18} className="text-emerald-600" /> Uso EAP — {report.periodLabel}
      </h2>
      <p className="text-sm text-slate-500">
        Estimativa de custo corporativo com base em {formatBrl(report.sessionPriceCents)} por sessão concluída.
      </p>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Sessões concluídas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.sessionsCompleted}</p>
          <p className="text-xs text-slate-400">{report.sessionsScheduled} agendadas</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Custo estimado</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatBrl(report.estimatedCostCents)}</p>
          <p className="text-xs text-slate-400">Repasse psicólogos ~{formatBrl(report.estimatedRepasseCents)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Utilização da cota</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.utilizationPercent}%</p>
          <p className="text-xs text-slate-400">de {report.sessionsQuotaTotal} sessões/ano</p>
        </div>
      </div>
      {report.byMonth.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase mb-2">Por mês</p>
          <div className="flex flex-wrap gap-2">
            {report.byMonth.map((m) => (
              <span key={m.month} className="text-xs bg-slate-100 rounded-lg px-2 py-1 text-slate-700">
                {m.month}: {m.completed} sessões · {formatBrl(m.estimatedCostCents)}
              </span>
            ))}
          </div>
        </div>
      )}
      <MeteredBillingNote />
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
            <Camera size={14} /> Snapshots mensais (faturamento)
          </p>
          <button
            type="button"
            onClick={generateSnapshot}
            disabled={generating}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            {generating ? "Gerando…" : "Gerar snapshot do mês"}
          </button>
        </div>
        {snapshots.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum snapshot gerado. Use para fechamento mensal EAP.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {snapshots.map((s) => (
              <span key={s.id} className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 text-emerald-800">
                {s.yearMonth}: {s.sessionsCompleted} sessões · {formatBrl(s.amountCents)}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
