"use client";

// src/app/(dashboard)/professional/financeiro/page.tsx
// Painel financeiro do profissional.
// Mostra: ganhos líquidos, brutos, comissão Doctor8, por tipo, gráfico mensal,
// lista de transações e projeção do mês.

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, DollarSign, Percent, FileText, Calendar,
  Loader2, AlertCircle, ChevronDown, ArrowUpRight,
  Stethoscope, Radio, MapPin, BarChart3, Info,
} from "lucide-react";
import ConsultPricingSettings from "@/components/professional/ConsultPricingSettings";
import { RateioSection } from "./RateioSection";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Period = "this_month" | "last_month" | "3_months" | "6_months" | "this_year" | "all";

interface Transaction {
  id:              string;
  date:            string;
  type:            string;
  patientInitials: string;
  grossCents:      number;
  commissionCents: number;
  netCents:        number;
  currency:        string;
  status:          string;
}

interface ChartPoint {
  label:          string;
  net:            number;
  gross:          number;
  count:          number;
  commissionCents?: number;
}

interface FinanceData {
  period:              string;
  currency:            string;
  commissionRate:      number;
  totalGrossCents:     number;
  totalCommissionCents:number;
  totalNetCents:       number;
  totalCount:          number;
  projectionCents:     number | null;
  byType:              Record<string, { grossCents: number; netCents: number; count: number }>;
  chartData:           ChartPoint[];
  transactions:        Transaction[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: currency || "BRL",
  }).format(cents / 100);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}

const PERIOD_LABELS: Record<Period, string> = {
  this_month: "Este mês",
  last_month: "Mês passado",
  "3_months": "Últimos 3 meses",
  "6_months": "Últimos 6 meses",
  this_year:  "Este ano",
  all:        "Todo o período",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "Teleconsulta":   <Stethoscope size={14} />,
  "Presencial":     <MapPin size={14} />,
  "Plantão Online": <Radio size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  "Teleconsulta":   "bg-brand-100 text-brand-600",
  "Presencial":     "bg-purple-100 text-purple-700",
  "Plantão Online": "bg-brand-100 text-brand-600",
};

// ── Mini bar chart (pure CSS) ─────────────────────────────────────────────────
function BarChart({ data, currency }: { data: ChartPoint[]; currency: string }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
      Sem dados para exibir
    </div>
  );

  const maxNet = Math.max(...data.map(d => d.net), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex flex-col items-center justify-end h-32 gap-0.5">
              {/* Gross bar (lighter) */}
              <div
                className="w-full bg-brand-100 rounded-t-sm"
                style={{ height: `${Math.round((d.gross / maxNet) * 100)}%`, minHeight: d.gross > 0 ? 4 : 0 }}
              />
              {/* Net bar (on top, same color but darker — overlaid) */}
            </div>
          </div>
        ))}
      </div>

      {/* Better chart: stacked approach */}
      <div className="flex items-end gap-1.5 h-36 px-1">
        {data.map((d, i) => {
          const netH   = maxNet > 0 ? Math.max((d.net   / maxNet) * 128, d.net   > 0 ? 4 : 0) : 0;
          const commH  = maxNet > 0 ? Math.max(((d.commissionCents ?? (d.gross - d.net)) / maxNet) * 128, 0) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0 group relative min-w-0">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                <p className="font-semibold">{d.label}</p>
                <p>Líquido: {fmt(d.net, currency)}</p>
                <p>Bruto: {fmt(d.gross, currency)}</p>
                <p>{d.count} consulta{d.count !== 1 ? "s" : ""}</p>
              </div>
              {/* Commission segment */}
              <div
                className="w-full bg-rose-200 rounded-t-none"
                style={{ height: Math.round(commH) }}
              />
              {/* Net segment */}
              <div
                className="w-full bg-brand-500 rounded-t-sm"
                style={{ height: Math.round(netH) }}
              />
            </div>
          );
        })}
      </div>

      {/* X axis labels */}
      <div className="flex gap-1.5 px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-400 truncate min-w-0">
            {d.label}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-brand-500" />
          <span className="text-xs text-slate-500">Líquido (seu)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-200" />
          <span className="text-xs text-slate-500">Comissão Doctor8</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [period,  setPeriod]  = useState<Period>("this_month");
  const [data,    setData]    = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [showAll, setShowAll] = useState(false);

  const loadData = useCallback(async (p: Period) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/professional/financeiro?period=${p}`);
      if (!res.ok) { setError("Erro ao carregar dados financeiros."); return; }
      const d = await res.json();
      setData(d);
    } catch { setError("Erro de rede."); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(period); }, [period, loadData]);

  const currency = data?.currency || "BRL";
  const txVisible = showAll ? (data?.transactions || []) : (data?.transactions || []).slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={24} className="text-brand-500" /> Financeiro
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Seus ganhos, repasses e o rateio do livro aberto
          </p>
        </div>

        {/* Period selector */}
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 shadow-sm cursor-pointer"
          >
            {Object.entries(PERIOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <ConsultPricingSettings />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      ) : data ? (
        <>
          {/* ── Cards de resumo ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Líquido */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Seu ganho líquido</p>
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <DollarSign size={15} className="text-brand-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{fmt(data.totalNetCents, currency)}</p>
              <p className="text-xs text-slate-400 mt-1">após comissão de 15%</p>
            </div>

            {/* Bruto */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor bruto</p>
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <ArrowUpRight size={15} className="text-brand-500" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{fmt(data.totalGrossCents, currency)}</p>
              <p className="text-xs text-slate-400 mt-1">total cobrado</p>
            </div>

            {/* Comissão */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comissão Doctor8</p>
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Percent size={15} className="text-rose-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{fmt(data.totalCommissionCents, currency)}</p>
              <p className="text-xs text-slate-400 mt-1">15% → custos + rateio</p>
            </div>

            {/* Consultas */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Consultas</p>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText size={15} className="text-purple-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{data.totalCount}</p>
              <p className="text-xs text-slate-400 mt-1">no período</p>
            </div>
          </div>

          {/* ── Projeção do mês ── */}
          {data.projectionCents != null && data.projectionCents > 0 && (
            <div className="bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-5 text-white flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold opacity-90 flex items-center gap-1.5">
                  <Calendar size={15} /> Projeção para este mês
                </p>
                <p className="text-3xl font-bold mt-1">{fmt(data.projectionCents, currency)}</p>
                <p className="text-xs opacity-70 mt-1">
                  Estimativa baseada no ritmo atual de consultas
                </p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold">
                  {data.projectionCents > 0
                    ? `+${Math.round(((data.projectionCents - data.totalNetCents) / Math.max(data.totalNetCents, 1)) * 100)}%`
                    : "—"
                  }
                </p>
                <p className="text-xs opacity-80">a receber ainda</p>
              </div>
            </div>
          )}

          {/* ── Gráfico mensal + por tipo ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Gráfico */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-brand-500" /> Evolução mensal
              </h2>
              <BarChart
                data={data.chartData.map(d => ({ label: d.label, net: d.net, gross: d.gross, count: d.count, commissionCents: d.gross - d.net }))}
                currency={currency}
              />
            </div>

            {/* Por tipo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Por tipo de consulta</h2>
              {Object.keys(data.byType).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.byType).map(([type, info]) => {
                    const pct = data.totalNetCents > 0
                      ? Math.round((info.netCents / data.totalNetCents) * 100)
                      : 0;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}>
                            {TYPE_ICONS[type]} {type}
                          </span>
                          <span className="text-xs text-slate-500">{info.count} consulta{info.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-16 text-right">
                            {fmt(info.netCents, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Totalizador */}
                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Total bruto</span>
                      <span>{fmt(data.totalGrossCents, currency)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600">
                      <span>Comissão Doctor8 (15%)</span>
                      <span>− {fmt(data.totalCommissionCents, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-brand-600 pt-1 border-t border-slate-100">
                      <span>Seu líquido</span>
                      <span>{fmt(data.totalNetCents, currency)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Aviso de comissão ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-slate-500">
            <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
            <p>
              A comissão de <strong>15%</strong> não é lucro da Doctor8. Ela entra num caixa transparente
              que paga os custos do sistema (IA, servidores, vídeo, taxas) e <strong>tudo o que sobra volta
              para os profissionais</strong> no rateio mensal — veja o livro aberto abaixo. A Doctor8 se
              mantém pela mensalidade, não pela comissão.
            </p>
          </div>

          {/* ── Lista de transações ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText size={16} className="text-slate-400" /> Transações
                <span className="text-xs font-normal text-slate-400">({data.transactions.length})</span>
              </h2>
            </div>

            {data.transactions.length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Nenhuma transação no período</p>
                <p className="text-slate-300 text-xs mt-1">As consultas pagas aparecerão aqui</p>
              </div>
            ) : (
              <>
                {/* Header da tabela */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-2">Data</div>
                  <div className="col-span-3">Tipo</div>
                  <div className="col-span-1 text-center">Pac.</div>
                  <div className="col-span-2 text-right">Bruto</div>
                  <div className="col-span-2 text-right text-rose-500">Comissão</div>
                  <div className="col-span-2 text-right text-brand-500">Líquido</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {txVisible.map((tx) => (
                    <div key={tx.id} className="px-5 py-3 hover:bg-slate-50 transition">
                      {/* Mobile */}
                      <div className="sm:hidden flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[tx.type] || "bg-slate-100 text-slate-600"}`}>
                              {TYPE_ICONS[tx.type]} {tx.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{fmtDate(tx.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-brand-600">{fmt(tx.netCents, tx.currency)}</p>
                          <p className="text-xs text-slate-400">de {fmt(tx.grossCents, tx.currency)}</p>
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2 text-xs text-slate-500">{fmtDate(tx.date)}</div>
                        <div className="col-span-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[tx.type] || "bg-slate-100 text-slate-600"}`}>
                            {TYPE_ICONS[tx.type]} {tx.type}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {tx.patientInitials}
                          </div>
                        </div>
                        <div className="col-span-2 text-right text-sm text-slate-600">{fmt(tx.grossCents, tx.currency)}</div>
                        <div className="col-span-2 text-right text-sm text-rose-500">− {fmt(tx.commissionCents, tx.currency)}</div>
                        <div className="col-span-2 text-right text-sm font-bold text-brand-600">{fmt(tx.netCents, tx.currency)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show more */}
                {data.transactions.length > 10 && (
                  <div className="px-5 py-4 border-t border-slate-100 text-center">
                    <button
                      onClick={() => setShowAll(v => !v)}
                      className="text-sm text-brand-500 hover:text-brand-600 font-semibold"
                    >
                      {showAll
                        ? "Mostrar menos"
                        : `Ver todas as ${data.transactions.length} transações`
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {/* ── Livro Aberto / Rateio ── */}
          <RateioSection currency={currency} />
        </>
      ) : null}
    </div>
  );
}
