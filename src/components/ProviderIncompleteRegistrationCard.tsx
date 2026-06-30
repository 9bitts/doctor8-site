"use client";

import Link from "next/link";
import { Sparkles, ChevronRight, Circle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const CHECKLIST_KEYS = [
  "provider.registration.checklist1",
  "provider.registration.checklist2",
  "provider.registration.checklist3",
] as const;

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
        <Sparkles size={24} className="text-rose-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-slate-900">{t("provider.registration.title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t("provider.registration.intro")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t("provider.registration.visibility")}
        </p>
        <p className="mt-3 text-sm font-medium text-slate-800">
          {t("provider.registration.checklistTitle")}
        </p>
        <ul className="mt-2 space-y-1.5">
          {CHECKLIST_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-slate-600">
              <Circle size={8} className="mt-1.5 shrink-0 fill-rose-400 text-rose-400" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {t("provider.registration.footer")}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
          {t("provider.registration.action")} <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}
