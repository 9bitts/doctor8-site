"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function DataExportSection() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/data");
      if (!res.ok) {
        setError(t("acct.exportData.errGeneric"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doctor8-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("acct.exportData.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{t("acct.exportData.title")}</p>
        <p className="text-xs text-slate-400 mt-0.5">{t("acct.exportData.desc")}</p>
        {error ? <p className="text-xs text-red-600 mt-2">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl transition min-h-[44px] shrink-0 disabled:opacity-60"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {t("acct.exportData.btn")}
      </button>
    </div>
  );
}
