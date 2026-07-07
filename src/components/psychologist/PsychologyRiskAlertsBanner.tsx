"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type RiskAlertItem = {
  id: string;
  patientRecordId: string | null;
  patientName: string;
  scaleId: string;
  level: string;
  messagePt: string;
  messageEn: string;
  messageEs: string;
  createdAt: string;
};

export default function PsychologyRiskAlertsBanner({ alerts }: { alerts: RiskAlertItem[] }) {
  const { t, lang } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  const msg = (a: RiskAlertItem) =>
    lang === "en" ? a.messageEn : lang === "es" ? a.messageEs : a.messagePt;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm">{t("psy.risk.bannerTitle")}</p>
          <p className="text-xs text-amber-800 mt-1">{t("psy.risk.bannerDesc")}</p>
          <ul className="mt-3 space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link
                  href={a.patientRecordId ? `/psychologist/patients/${a.patientRecordId}` : "/psychologist/scales"}
                  className="flex items-center gap-2 text-sm text-amber-900 hover:text-amber-950 bg-white/60 rounded-lg px-3 py-2 border border-amber-100"
                >
                  <span className="font-medium truncate">{a.patientName}</span>
                  <span className="text-xs text-amber-700 truncate flex-1">{msg(a)}</span>
                  <ChevronRight size={14} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-amber-700 hover:text-amber-900 shrink-0"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
