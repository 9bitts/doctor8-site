"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  appointmentId: string;
  confirmed: boolean;
  within48h: boolean;
  compact?: boolean;
  onConfirmed?: () => void;
};

export default function ConfirmAttendanceButton({
  appointmentId,
  confirmed,
  within48h,
  compact,
  onConfirmed,
}: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [localConfirmed, setLocalConfirmed] = useState(confirmed);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLocalConfirmed(confirmed);
  }, [confirmed]);

  if (!within48h && !localConfirmed) return null;

  if (localConfirmed) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium text-brand-700 bg-brand-50 border border-brand-100 rounded-lg ${
          compact ? "text-[10px] px-2 py-1" : "text-xs px-2.5 py-1.5"
        }`}
      >
        <CheckCircle2 size={compact ? 11 : 12} />
        {t("appt.presenceConfirmed")}
      </span>
    );
  }

  async function confirm() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/confirm-attendance`, {
        method: "POST",
      });
      if (res.ok) {
        setLocalConfirmed(true);
        onConfirmed?.();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={confirm}
        disabled={loading}
        className={`inline-flex items-center gap-1 font-semibold text-white bg-brand-500 hover:bg-brand-400 disabled:opacity-50 rounded-lg transition ${
          compact ? "text-[10px] px-2 py-1" : "text-xs px-2.5 py-1.5"
        }`}
      >
        {loading ? <Loader2 size={compact ? 11 : 12} className="animate-spin" /> : <CheckCircle2 size={compact ? 11 : 12} />}
        {t("appt.confirmPresence")}
      </button>
      {error && (
        <span className={`text-rose-600 ${compact ? "text-[10px]" : "text-xs"}`}>
          {t("appt.presenceConfirmError")}
        </span>
      )}
    </span>
  );
}
