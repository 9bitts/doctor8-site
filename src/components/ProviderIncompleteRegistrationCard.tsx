"use client";

import Link from "next/link";
import { Heart, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function ProviderIncompleteRegistrationCard({
  settingsHref,
}: {
  settingsHref: string;
}) {
  const { t } = useI18n();

  return (
    <Link
      href={settingsHref}
      className="mb-6 flex items-start gap-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm transition hover:border-rose-300 hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100">
        <Heart size={24} className="text-rose-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{t("provider.registration.title")}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {t("provider.registration.text")}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
          {t("provider.registration.action")} <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}
