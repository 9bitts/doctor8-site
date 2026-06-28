"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function FindError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("[patient/find]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center space-y-4">
      <AlertCircle size={40} className="text-rose-500 mx-auto" />
      <h1 className="text-lg font-bold text-slate-900">{t("patient.find.errTitle")}</h1>
      <p className="text-sm text-slate-500">
        {t("patient.find.errHint")}{" "}
        <code className="text-xs bg-slate-100 px-1 rounded">npx prisma db push</code>.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
        >
          {t("common.retry")}
        </button>
        <Link href="/patient" className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700">
          {t("patient.find.backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
