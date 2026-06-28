"use client";

import { useCallback, useEffect, useState } from "react";
import { Plug, Loader2, RefreshCw, CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Health = "ok" | "partial" | "missing" | "fallback";

interface Row {
  id: string;
  health: Health;
  configured: boolean;
  detail: string;
}

export default function AdminIntegrationsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/integrations");
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      setRows(data.integrations || []);
      setCheckedAt(data.checkedAt || null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function icon(h: Health) {
    if (h === "ok") return <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />;
    if (h === "partial" || h === "fallback") return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
    return <MinusCircle size={18} className="text-slate-400 shrink-0" />;
  }

  function badge(h: Health) {
    const cls =
      h === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : h === "partial" || h === "fallback" ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
    return (
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}>
        {t(`admin.int.health.${h}`)}
      </span>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Plug size={24} className="text-brand-500" /> {t("admin.int.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("admin.int.subtitle")}</p>
          {checkedAt && (
            <p className="text-xs text-slate-400 mt-1">
              {t("admin.int.checkedAt")} {new Date(checkedAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-3 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {t("common.retry")}
        </button>
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          {t("common.loadError")}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.id} className="px-5 py-4 flex items-start gap-3">
              {icon(row.health)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 text-sm">{t(`admin.int.${row.id}`)}</p>
                  {badge(row.health)}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">{t("admin.int.footer")}</p>
    </div>
  );
}
