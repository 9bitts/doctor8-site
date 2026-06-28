"use client";

import { useCallback, useEffect, useState } from "react";
import { PieChart, Loader2, RefreshCw, Play, Eye, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

interface Contribution {
  professionalId: string;
  validConsults: number;
  qualified: boolean;
  disqualReason: string | null;
  totalCents: number;
  baseCents: number;
  meritCents: number;
}

interface PreviewData {
  month: string;
  currency: string;
  commissionCents: number;
  costFixedCents: number;
  costUsageCents: number;
  poolCents: number;
  contributions: Contribution[];
}

function defaultMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminRateioClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [month, setMonth] = useState(defaultMonth);
  const [currency, setCurrency] = useState("BRL");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [runResult, setRunResult] = useState<string>("");

  function fmt(cents: number): string {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  }

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    setRunResult("");
    try {
      const res = await fetch(`/api/admin/rateio?action=preview&month=${month}&currency=${currency}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("common.loadError")); setPreview(null); return; }
      setPreview(data);
    } catch {
      setError(t("common.loadError"));
    } finally {
      setLoading(false);
    }
  }, [month, currency, t]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  async function runClose() {
    if (!window.confirm(t("admin.rateio.runConfirm"))) return;
    setRunning(true);
    setError("");
    setRunResult("");
    try {
      const res = await fetch(`/api/admin/rateio?action=run&month=${month}&currency=${currency}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("common.loadError")); return; }
      setRunResult(
        t("admin.rateio.runOk")
          .replace("{{pool}}", fmt(data.close?.poolCents ?? 0))
          .replace("{{n}}", String(data.close?.professionals ?? 0)),
      );
      await loadPreview();
    } catch {
      setError(t("common.loadError"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PieChart size={24} className="text-brand-500" /> {t("admin.rateio.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("admin.rateio.subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">{t("admin.rateio.month")}</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">{t("admin.rateio.currency")}</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-4 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
        >
          <Eye size={14} /> {t("admin.rateio.preview")}
        </button>
        <button
          type="button"
          onClick={runClose}
          disabled={running || loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {t("admin.rateio.run")}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {runResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
          {runResult}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : preview ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("rateio.commission"), value: preview.commissionCents },
              { label: t("rateio.totalFixed"), value: preview.costFixedCents },
              { label: t("rateio.totalUsage"), value: preview.costUsageCents },
              { label: t("rateio.poolTitle"), value: preview.poolCents, highlight: true },
            ].map((c) => (
              <div key={c.label} className={`rounded-2xl border p-4 ${c.highlight ? "bg-brand-50 border-brand-200" : "bg-white border-slate-100"}`}>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">{t("admin.rateio.contributions")}</p>
              <button type="button" onClick={loadPreview} className="text-xs text-brand-600 flex items-center gap-1">
                <RefreshCw size={12} /> {t("common.retry")}
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">{t("admin.rateio.colPro")}</th>
                  <th className="px-4 py-2">{t("admin.rateio.colConsults")}</th>
                  <th className="px-4 py-2">{t("admin.rateio.colQualified")}</th>
                  <th className="px-4 py-2 text-right">{t("admin.rateio.colTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.contributions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("admin.rateio.noData")}</td></tr>
                ) : preview.contributions.map((c) => (
                  <tr key={c.professionalId}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 truncate max-w-[120px]">{c.professionalId.slice(0, 10)}?</td>
                    <td className="px-4 py-2">{c.validConsults}</td>
                    <td className="px-4 py-2">{c.qualified ? "?" : (c.disqualReason || "?")}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmt(c.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
