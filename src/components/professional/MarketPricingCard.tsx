"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { TrendingUp, Loader2, BarChart3 } from "lucide-react";
import Link from "next/link";

type Insight = {
  specialty: string;
  city: string | null;
  yourPriceCents: number;
  currency: string;
  peerCount: number;
  medianPriceCents: number;
  minPriceCents: number;
  maxPriceCents: number;
  percentile: number | null;
};

export default function MarketPricingCard() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/professional/market-pricing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInsight(d?.insight ?? null))
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, []);

  function fmt(cents: number, currency: string) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "BRL",
        maximumFractionDigits: 0,
      }).format(cents / 100);
    } catch {
      return `R$ ${(cents / 100).toFixed(0)}`;
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        {t("market.loading")}
      </div>
    );
  }

  if (!insight || insight.peerCount < 2) {
    return null;
  }

  const diff = insight.yourPriceCents - insight.medianPriceCents;
  const diffLabel =
    diff === 0
      ? t("market.atMedian")
      : diff > 0
        ? t("market.aboveMedian").replace("{amount}", fmt(Math.abs(diff), insight.currency))
        : t("market.belowMedian").replace("{amount}", fmt(Math.abs(diff), insight.currency));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-500" />
          {t("market.title")}
        </h3>
        <Link
          href="/professional/settings"
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          {t("market.adjustPrice")}
        </Link>
      </div>
      <p className="text-xs text-slate-500">
        {t("market.subtitle")
          .replace("{city}", insight.city || t("market.yourRegion"))
          .replace("{n}", String(insight.peerCount))}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-xl p-2">
          <p className="text-[10px] text-slate-500 uppercase">{t("market.yours")}</p>
          <p className="text-sm font-bold text-slate-800">
            {fmt(insight.yourPriceCents, insight.currency)}
          </p>
        </div>
        <div className="bg-brand-50 rounded-xl p-2">
          <p className="text-[10px] text-brand-600 uppercase">{t("market.median")}</p>
          <p className="text-sm font-bold text-brand-700">
            {fmt(insight.medianPriceCents, insight.currency)}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2">
          <p className="text-[10px] text-slate-500 uppercase">{t("market.range")}</p>
          <p className="text-xs font-semibold text-slate-700">
            {fmt(insight.minPriceCents, insight.currency)} ?{" "}
            {fmt(insight.maxPriceCents, insight.currency)}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-600 flex items-center gap-1.5">
        <TrendingUp size={13} className="text-emerald-500 shrink-0" />
        {diffLabel}
        {insight.percentile != null && (
          <span className="text-slate-400">
            ? {t("market.percentile").replace("{p}", String(insight.percentile))}
          </span>
        )}
      </p>
    </div>
  );
}
