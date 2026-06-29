"use client";

// src/app/(dashboard)/professional/financeiro/page.tsx
// Painel financeiro do profissional.
// Mostra: ganhos líquidos, brutos, comissão Doctor8, por tipo, gráfico mensal,
// lista de transações e projeção do mês.

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, DollarSign, Percent, FileText, Calendar,
  Loader2, AlertCircle, ChevronDown, ArrowUpRight, RefreshCw,
  Stethoscope, Radio, MapPin, BarChart3, Info,
} from "lucide-react";
import ConsultPricingSettings, {
  type ConsultPricingSettingsProps,
} from "@/components/professional/ConsultPricingSettings";
import { RateioSection } from "./RateioSection";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { financeTypeLabel, FINANCE_TYPE_COLORS } from "@/lib/finance-display";

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
function fmt(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "BRL",
  }).format(cents / 100);
}

function fmtDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PERIOD_KEYS: Record<Period, string> = {
  this_month: "fin.periodThisMonth",
  last_month: "fin.periodLastMonth",
  "3_months": "fin.period3Months",
  "6_months": "fin.period6Months",
  this_year: "fin.periodThisYear",
  all: "fin.periodAll",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  TELECONSULT: <Stethoscope size={14} />,
  IN_PERSON: <MapPin size={14} />,
  JIT: <Radio size={14} />,
};

// ── Mini bar chart (pure CSS) ─────────────────────────────────────────────────
function BarChart({
  data, currency, locale, emptyText, legendNet, legendComm, consultLabel, netLabel, grossLabel,
}: {
  data: ChartPoint[];
  currency: string;
  locale: string;
  emptyText: string;
  legendNet: string;
  legendComm: string;
  consultLabel: (count: number) => string;
  netLabel: string;
  grossLabel: string;
}) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
      {emptyText}
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
                <p>{netLabel}: {fmt(d.net, currency, locale)}</p>
                <p>{grossLabel}: {fmt(d.gross, currency, locale)}</p>
                <p>{consultLabel(d.count)}</p>
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
          <span className="text-xs text-slate-500">{legendNet}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-200" />
          <span className="text-xs text-slate-500">{legendComm}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export type FinanceiroDashboardProps = {
  apiPath?: string;
  showPricingSettings?: boolean;
  showRateio?: boolean;
  pricingSettingsProps?: ConsultPricingSettingsProps;
};

export function FinanceiroDashboard({
  apiPath = "/api/professional/financeiro",
  showPricingSettings = true,
  showRateio = true,
  pricingSettingsProps,
}: FinanceiroDashboardProps) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [period,  setPeriod]  = useState<Period>("this_month");
  const [data,    setData]    = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [showAll, setShowAll] = useState(false);

  const loadData = useCallback(async (p: Period) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiPath}?period=${p}`);
      if (!res.ok) { setError(t("common.loadError")); return; }
      const d = await res.json();
      setData(d);
    } catch { setError(t("common.loadError")); }
    setLoading(false);
  }, [t, apiPath]);

  useEffect(() => { loadData(period); }, [period, loadData]);

  const currency = data?.currency || "BRL";
  const txVisible = showAll ? (data?.transactions || []) : (data?.transactions || []).slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={24} className="text-brand-500" /> {t("fin.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("fin.subtitle")}</p>
        </div>

        {/* Period selector */}
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 shadow-sm cursor-pointer"
          >
            {Object.entries(PERIOD_KEYS).map(([v, key]) => (
              <option key={v} value={v}>{t(key)}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {showPricingSettings && <ConsultPricingSettings {...pricingSettingsProps} />}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 flex-wrap">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => loadData(period)}
            className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline shrink-0"
          >
            <RefreshCw size={13} /> {t("common.retry")}
          </button>
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("fin.netEarnings")}</p>
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <DollarSign size={15} className="text-brand-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{fmt(data.totalNetCents, currency, locale)}</p>
              <p className="text-xs text-slate-400 mt-1">{t("fin.afterCommission")}</p>
            </div>

            {/* Bruto */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("fin.grossTotal")}</p>
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <ArrowUpRight size={15} className="text-brand-500" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{fmt(data.totalGrossCents, currency, locale)}</p>
              <p className="text-xs text-slate-400 mt-1">{t("fin.totalCharged")}</p>
            </div>

            {/* Comissão */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("fin.commission")}</p>
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Percent size={15} className="text-rose-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{fmt(data.totalCommissionCents, currency, locale)}</p>
              <p className="text-xs text-slate-400 mt-1">{t("fin.commissionHint")}</p>
            </div>

            {/* Consultas */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("fin.consultations")}</p>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText size={15} className="text-purple-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{data.totalCount}</p>
              <p className="text-xs text-slate-400 mt-1">{t("fin.inPeriod")}</p>
            </div>
          </div>

          {/* ── Projeção do mês ── */}
          {data.projectionCents != null && data.projectionCents > 0 && (
            <div className="bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-5 text-white flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold opacity-90 flex items-center gap-1.5">
                  <Calendar size={15} /> {t("fin.projectionTitle")}
                </p>
                <p className="text-3xl font-bold mt-1">{fmt(data.projectionCents, currency, locale)}</p>
                <p className="text-xs opacity-70 mt-1">{t("fin.projectionHint")}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold">
                  {data.projectionCents > 0
                    ? `+${Math.round(((data.projectionCents - data.totalNetCents) / Math.max(data.totalNetCents, 1)) * 100)}%`
                    : "—"
                  }
                </p>
                <p className="text-xs opacity-80">{t("fin.projectionRemaining")}</p>
              </div>
            </div>
          )}

          {/* ── Gráfico mensal + por tipo ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Gráfico */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-brand-500" /> {t("fin.monthlyChart")}
              </h2>
              <BarChart
                data={data.chartData.map(d => ({ label: d.label, net: d.net, gross: d.gross, count: d.count, commissionCents: d.gross - d.net }))}
                currency={currency}
                locale={locale}
                emptyText={t("fin.noChartData")}
                legendNet={t("fin.legendNet")}
                legendComm={t("fin.legendCommission")}
                netLabel={t("fin.net")}
                grossLabel={t("fin.gross")}
                consultLabel={(n) => (n === 1 ? t("fin.oneConsult") : t("fin.nConsults").replace("{{n}}", String(n)))}
              />
            </div>

            {/* Por tipo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">{t("fin.byType")}</h2>
              {Object.keys(data.byType).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">{t("fin.noData")}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.byType).map(([type, info]) => {
                    const pct = data.totalNetCents > 0
                      ? Math.round((info.netCents / data.totalNetCents) * 100)
                      : 0;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${FINANCE_TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}>
                            {TYPE_ICONS[type]} {financeTypeLabel(type, t)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {info.count === 1 ? t("fin.oneConsult") : t("fin.nConsults").replace("{{n}}", String(info.count))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-16 text-right">
                            {fmt(info.netCents, currency, locale)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Totalizador */}
                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{t("fin.grossTotal")}</span>
                      <span>{fmt(data.totalGrossCents, currency, locale)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600">
                      <span>{t("fin.commissionPct")}</span>
                      <span>− {fmt(data.totalCommissionCents, currency, locale)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-brand-600 pt-1 border-t border-slate-100">
                      <span>{t("fin.yourNet")}</span>
                      <span>{fmt(data.totalNetCents, currency, locale)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Aviso de comissão ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-slate-500">
            <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
            <p>{t("fin.commissionNote")}</p>
          </div>

          {/* ── Lista de transações ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText size={16} className="text-slate-400" /> {t("fin.transactions")}
                <span className="text-xs font-normal text-slate-400">({data.transactions.length})</span>
              </h2>
            </div>

            {data.transactions.length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">{t("fin.noTransactions")}</p>
                <p className="text-slate-300 text-xs mt-1">{t("fin.noTransactionsHint")}</p>
              </div>
            ) : (
              <>
                {/* Header da tabela */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-2">{t("fin.colDate")}</div>
                  <div className="col-span-3">{t("fin.colType")}</div>
                  <div className="col-span-1 text-center">{t("fin.colPatient")}</div>
                  <div className="col-span-2 text-right">{t("fin.gross")}</div>
                  <div className="col-span-2 text-right text-rose-500">{t("fin.commissionShort")}</div>
                  <div className="col-span-2 text-right text-brand-500">{t("fin.net")}</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {txVisible.map((tx) => (
                    <div key={tx.id} className="px-5 py-3 hover:bg-slate-50 transition">
                      {/* Mobile */}
                      <div className="sm:hidden flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FINANCE_TYPE_COLORS[tx.type] || "bg-slate-100 text-slate-600"}`}>
                              {TYPE_ICONS[tx.type]} {financeTypeLabel(tx.type, t)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{fmtDate(tx.date, locale)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-brand-600">{fmt(tx.netCents, tx.currency, locale)}</p>
                          <p className="text-xs text-slate-400">{t("fin.fromGross").replace("{{amount}}", fmt(tx.grossCents, tx.currency, locale))}</p>
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2 text-xs text-slate-500">{fmtDate(tx.date, locale)}</div>
                        <div className="col-span-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${FINANCE_TYPE_COLORS[tx.type] || "bg-slate-100 text-slate-600"}`}>
                            {TYPE_ICONS[tx.type]} {financeTypeLabel(tx.type, t)}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {tx.patientInitials}
                          </div>
                        </div>
                        <div className="col-span-2 text-right text-sm text-slate-600">{fmt(tx.grossCents, tx.currency, locale)}</div>
                        <div className="col-span-2 text-right text-sm text-rose-500">− {fmt(tx.commissionCents, tx.currency, locale)}</div>
                        <div className="col-span-2 text-right text-sm font-bold text-brand-600">{fmt(tx.netCents, tx.currency, locale)}</div>
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
                        ? t("fin.showLess")
                        : t("fin.showAllTx").replace("{{n}}", String(data.transactions.length))
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {/* ── Livro Aberto / Rateio ── */}
          {showRateio && <RateioSection currency={currency} />}
        </>
      ) : null}
    </div>
  );
}

export default function ProfessionalFinanceiroPage() {
  return <FinanceiroDashboard />;
}
