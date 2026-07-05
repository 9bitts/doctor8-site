"use client";

import Link from "next/link";
import { Sparkles, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { RegistrationChecklistKey } from "@/lib/provider-registration-complete";
import { registrationChecklistHash } from "@/lib/provider-registration-complete";

const CHECKLIST_ITEMS: { key: RegistrationChecklistKey; labelKey: string }[] = [
  { key: "professionalData", labelKey: "provider.registration.checklist1" },
  { key: "verificationDocuments", labelKey: "provider.registration.checklist2" },
  { key: "careSettings", labelKey: "provider.registration.checklist3" },
];

export default function ProviderIncompleteRegistrationCard({
  settingsHref,
  checklist,
  missing,
}: {
  settingsHref: string;
  checklist?: Partial<Record<RegistrationChecklistKey, boolean>>;
  missing?: RegistrationChecklistKey[];
}) {
  const { t } = useI18n();

  const firstMissing = missing?.[0];
  const href = firstMissing
    ? `${settingsHref}#${registrationChecklistHash(firstMissing)}`
    : settingsHref;

  return (
    <Link
      href={href}
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
          {CHECKLIST_ITEMS.map(({ key, labelKey }) => {
            const done = checklist?.[key] === true;
            return (
              <li
                key={key}
                className={`flex items-start gap-2 text-sm ${
                  done ? "text-slate-500" : "font-semibold text-red-600"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle size={8} className="mt-1.5 shrink-0 fill-red-500 text-red-500" />
                )}
                <span>{t(labelKey)}</span>
              </li>
            );
          })}
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
