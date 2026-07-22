"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { AlertTriangle, CheckCircle2, Loader2, UserPlus } from "lucide-react";

type EmissionAlert = {
  resourceType: "PRESCRIPTION";
  resourceId: string;
  professionalUserId: string;
  professionalName: string;
  licenseNumber: string | null;
  createdAt: string;
};

export default function PatientEmissionAlertsPanel() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<EmissionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/emission-reports");
      if (res.ok) {
        const d = await res.json();
        setAlerts(d.alerts || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function postAction(alert: EmissionAlert, action: "report" | "accept") {
    const key = `${action}:${alert.resourceId}`;
    setActingKey(key);
    try {
      const res = await fetch("/api/patient/emission-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalUserId: alert.professionalUserId,
          resourceType: alert.resourceType,
          resourceId: alert.resourceId,
          action,
        }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.filter(
            (a) =>
              a.resourceId !== alert.resourceId &&
              a.professionalUserId !== alert.professionalUserId,
          ),
        );
      }
    } finally {
      setActingKey(null);
    }
  }

  if (loading || alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {alerts.map((alert) => {
        const acceptKey = `accept:${alert.resourceId}`;
        const reportKey = `report:${alert.resourceId}`;
        const busy = actingKey === acceptKey || actingKey === reportKey;
        return (
          <div
            key={alert.resourceId}
            className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {t("patientEmission.alertTitle").replace("{{name}}", alert.professionalName)}
              </p>
              <p className="text-xs text-amber-800/90 mt-1">{t("patientEmission.alertDesc")}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => postAction(alert, "accept")}
                className="inline-flex items-center justify-center gap-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg min-h-[44px] disabled:opacity-50"
              >
                {actingKey === acceptKey ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                {t("patientEmission.acceptLink")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => postAction(alert, "report")}
                className="inline-flex items-center justify-center gap-1 text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg min-h-[44px] disabled:opacity-50"
              >
                {actingKey === reportKey ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {t("patientEmission.reportUnknown")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
