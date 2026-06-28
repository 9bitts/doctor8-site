"use client";

// src/app/(dashboard)/professional/financeiro/RateioSection.tsx
// Segunda seção do Financeiro: livro aberto (comissão - custos = pote) + rateio do profissional.

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  BookOpen, Loader2, Users, Award, TrendingDown, Sparkles, History, Info, CheckCircle2, XCircle,
  AlertCircle, RefreshCw,
} from "lucide-react";

interface CostLine {
  type: "COST_FIXED" | "COST_USAGE";
  category: string;
  source: string;
  amountCents: number;
}
interface Mine {
  validConsults: number;
  qualified: boolean;
  disqualReason: string | null;
  qualityMult: number;
  score: number;
  baseCents: number;
  meritCents: number;
  totalCents: number;
  payoutStatus: string;
}
interface LatestPeriod {
  month: string;
  currency: string;
  commissionCents: number;
  costFixedCents: number;
  costUsageCents: number;
  poolCents: number;
  baseFraction: number;
  meritFraction: number;
  lockedAt: string | null;
  professionalsCount: number;
  costBreakdown: CostLine[];
  mine: Mine | null;
}
interface HistoryItem {
  month: string;
  currency: string;
  poolCents: number;
  totalCents: number;
  qualified: boolean;
}
interface RateioData {
  latest: LatestPeriod | null;
  history: HistoryItem[];
}

export function RateioSection({ currency: fallbackCurrency }: { currency: string }) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [data, setData] = useState<RateioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  function fmt(cents: number, currency: string): string {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "BRL" }).format(cents / 100);
  }
  function fmtMonth(m: string): string {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  }
  function catLabel(cat: string): string {
    return t(`rateio.cat.${cat}`) !== `rateio.cat.${cat}` ? t(`rateio.cat.${cat}`) : cat;
  }
  function srcLabel(src: string): string {
    return t(`rateio.src.${src}`) !== `rateio.src.${src}` ? t(`rateio.src.${src}`) : src;
  }

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/professional/financeiro/rateio");
      if (!res.ok) { setLoadError(true); return; }
      setData(await res.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 flex flex-col items-center gap-3">
        <AlertCircle size={24} className="text-amber-500" />
        <p className="text-sm text-slate-600">{t("common.loadError")}</p>
        <button type="button" onClick={load} className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
          <RefreshCw size={14} /> {t("common.retry")}
        </button>
      </div>
    );
  }

  const latest = data?.latest ?? null;
  const cur = latest?.currency || fallbackCurrency || "BRL";

  if (!latest) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={18} className="text-brand-500" /> {t("rateio.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">{t("rateio.emptyDesc")}</p>
      </div>
    );
  }

  const m = latest.mine;
  const closedLabel = latest.lockedAt
    ? t("rateio.closedOn").replace("{{date}}", new Date(latest.lockedAt).toLocaleDateString(locale))
    : "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={18} className="text-brand-500" /> {t("rateio.title")}
        </h2>
        <span className="text-xs text-slate-400 capitalize">
          {fmtMonth(latest.month)} · {closedLabel}
        </span>
      </div>

      <div className="bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold opacity-90 flex items-center gap-1.5">
              <Sparkles size={15} /> {t("rateio.yourShare").replace("{{month}}", fmtMonth(latest.month))}
            </p>
            {m && m.qualified ? (
              <>
                <p className="text-3xl font-bold mt-1">{fmt(m.totalCents, cur)}</p>
                <p className="text-xs opacity-80 mt-1">
                  {t("rateio.baseMerit")
                    .replace("{{base}}", fmt(m.baseCents, cur))
                    .replace("{{merit}}", fmt(m.meritCents, cur))
                    .replace("{{n}}", String(m.validConsults))}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold mt-1">{t("rateio.notParticipating")}</p>
                <p className="text-xs opacity-80 mt-1">{m?.disqualReason || t("rateio.noValidConsults")}</p>
              </>
            )}
          </div>
          {m && (
            <div className="bg-white/20 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold flex items-center gap-1.5 justify-center">
                {m.qualified ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                {m.qualified ? t("rateio.qualified") : "-"}
              </p>
              <p className="text-xs opacity-80">{t("rateio.multiplier").replace("{{n}}", m.qualityMult.toFixed(2))}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Users size={16} className="text-brand-500" />{" "}
          {t("rateio.poolSource").replace("{{n}}", String(latest.professionalsCount))}
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-2">
              {t("rateio.commission")}
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{t("rateio.sourceStripe")}</span>
            </span>
            <span className="font-semibold text-slate-800">{fmt(latest.commissionCents, cur)}</span>
          </div>

          {latest.costBreakdown.length > 0 && (
            <div className="pl-1 border-l-2 border-rose-100 space-y-1.5 my-2">
              {latest.costBreakdown.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-2">
                    <TrendingDown size={12} className="text-rose-400" />
                    {catLabel(c.category)}
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {c.type === "COST_FIXED" ? t("rateio.costFixed") : t("rateio.costUsage")} · {srcLabel(c.source)}
                    </span>
                  </span>
                  <span className="text-rose-500">- {fmt(c.amountCents, cur)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-rose-500">
            <span>{t("rateio.totalFixed")}</span><span>- {fmt(latest.costFixedCents, cur)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-rose-500">
            <span>{t("rateio.totalUsage")}</span><span>- {fmt(latest.costUsageCents, cur)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Award size={15} className="text-brand-500" /> {t("rateio.poolTitle")}
            </span>
            <span className="text-lg font-bold text-brand-600">{fmt(latest.poolCents, cur)}</span>
          </div>
          <p className="text-[11px] text-slate-400 text-right">
            {t("rateio.splitNote")
              .replace("{{base}}", String(Math.round(latest.baseFraction * 100)))
              .replace("{{merit}}", String(Math.round(latest.meritFraction * 100)))}
          </p>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-start gap-2 text-[11px] text-slate-500">
          <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
          <p>{t("rateio.auditNote")}</p>
        </div>
      </div>

      {data && data.history.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <History size={15} className="text-slate-400" /> {t("rateio.history")}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {data.history.map((h, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 capitalize">{fmtMonth(h.month)}</p>
                  <p className="text-xs text-slate-400">
                    {t("rateio.monthPool").replace("{{amount}}", fmt(h.poolCents, h.currency))}
                  </p>
                </div>
                <span className={`text-sm font-bold ${h.qualified ? "text-brand-600" : "text-slate-400"}`}>
                  {h.qualified ? fmt(h.totalCents, h.currency) : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
