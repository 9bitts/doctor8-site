"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PatientRegistrationFieldKey } from "@/lib/patient-registration-complete";

const CHECKLIST_ITEMS: { key: PatientRegistrationFieldKey; labelKey: string }[] = [
  { key: "name", labelKey: "pdash.completeProfile.checklistName" },
  { key: "dateOfBirth", labelKey: "pdash.completeProfile.checklistDob" },
  { key: "address", labelKey: "pdash.completeProfile.checklistAddress" },
];

export default function PatientIncompleteRegistrationCard({
  checklist,
  missing,
}: {
  checklist?: Partial<Record<PatientRegistrationFieldKey, boolean>>;
  missing?: PatientRegistrationFieldKey[];
}) {
  const { t } = useI18n();

  const firstMissing = missing?.[0];
  const href = firstMissing ? `/patient/account#patient-${firstMissing}` : "/patient/account";

  return (
    <Link
      href={href}
      className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition"
    >
      <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">{t("pdash.completeProfile.title")}</p>
        <p className="text-xs text-amber-700 mt-0.5">{t("pdash.completeProfile.text")}</p>
        <p className="mt-2 text-xs font-medium text-amber-900">{t("provider.registration.checklistTitle")}</p>
        <ul className="mt-1.5 space-y-1">
          {CHECKLIST_ITEMS.map(({ key, labelKey }) => {
            const done = checklist?.[key] === true;
            return (
              <li
                key={key}
                className={`flex items-start gap-2 text-xs ${
                  done ? "text-amber-700/70" : "font-semibold text-red-600"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle size={6} className="mt-1 shrink-0 fill-red-500 text-red-500" />
                )}
                <span>{t(labelKey)}</span>
              </li>
            );
          })}
        </ul>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
          {t("pdash.completeProfile.action")} <ChevronRight size={13} />
        </span>
      </div>
    </Link>
  );
}
