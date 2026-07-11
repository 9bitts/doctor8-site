"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useRegistrationChecklist } from "@/hooks/useRegistrationChecklist";
import {
  registrationChecklistHash,
  type RegistrationChecklistKey,
} from "@/lib/provider-registration-complete";

const CHECKLIST_ITEMS: { key: RegistrationChecklistKey; labelKey: string }[] = [
  { key: "professionalData", labelKey: "provider.registration.checklist1" },
  { key: "verificationDocuments", labelKey: "provider.registration.checklist2" },
  { key: "careSettings", labelKey: "provider.registration.checklist3" },
];

export default function PsychoanalystOnboardingCard() {
  const { t } = useI18n();
  const { providerChecklist, registrationIncomplete, loading } = useRegistrationChecklist();

  if (loading || !registrationIncomplete || !providerChecklist) return null;

  const incompleteItems = CHECKLIST_ITEMS.filter(({ key }) => providerChecklist[key] !== true);
  if (incompleteItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
          <Sparkles size={24} className="text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900">{t("pa.onboarding.title")}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t("pa.onboarding.subtitle")}</p>
          <ul className="mt-3 space-y-2">
            {CHECKLIST_ITEMS.map(({ key, labelKey }) => {
              const done = providerChecklist[key] === true;
              if (done) return null;
              return (
                <li key={key}>
                  <Link
                    href={`/psychoanalyst/settings#${registrationChecklistHash(key)}`}
                    className="flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900 transition"
                  >
                    <Circle size={8} className="shrink-0 fill-violet-500 text-violet-500" />
                    <span className="flex-1">{t(labelKey)}</span>
                    <ChevronRight size={14} className="shrink-0 text-violet-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/psychoanalyst/settings#${registrationChecklistHash(incompleteItems[0].key)}`}
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            {t("pa.onboarding.action")} <ChevronRight size={16} />
          </Link>
        </div>
        <CheckCircle2 size={20} className="hidden sm:block shrink-0 text-violet-200" />
      </div>
    </div>
  );
}
