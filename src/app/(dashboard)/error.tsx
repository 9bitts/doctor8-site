"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
      <AlertCircle size={40} className="text-rose-500 mx-auto" aria-hidden />
      <h1 className="text-lg font-bold text-slate-900">{t("dash.err.title")}</h1>
      <p className="text-sm text-slate-500 leading-relaxed">{t("dash.err.hint")}</p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono">{error.digest}</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
        >
          {t("common.retry")}
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("dash.err.home")}
        </Link>
      </div>
    </div>
  );
}
