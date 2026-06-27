"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function ProviderVerificationBanner({
  settingsHref,
}: {
  settingsHref: string;
}) {
  const { t } = useI18n();

  return (
    <Link
      href={settingsHref}
      className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition"
    >
      <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">{t("provider.verify.title")}</p>
        <p className="text-xs text-amber-700 mt-0.5">{t("provider.verify.text")}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
          {t("provider.verify.action")} <ChevronRight size={13} />
        </span>
      </div>
    </Link>
  );
}
