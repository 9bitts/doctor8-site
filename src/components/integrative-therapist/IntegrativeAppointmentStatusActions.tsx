"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";

type StatusAction = "confirm" | "complete";

interface IntegrativeAppointmentStatusActionsProps {
  appointmentId: string;
  status: string;
  scheduledAt: string;
  compact?: boolean;
  onStatusChange?: (id: string, status: string) => void;
}

export default function IntegrativeAppointmentStatusActions({
  appointmentId,
  status,
  scheduledAt,
  compact = false,
  onStatusChange,
}: IntegrativeAppointmentStatusActionsProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [loading, setLoading] = useState<StatusAction | null>(null);

  const isPast = new Date(scheduledAt).getTime() < Date.now();
  const showConfirm = status === "PENDING";
  const showComplete = status === "CONFIRMED" && isPast;

  async function runAction(action: StatusAction) {
    setLoading(action);
    try {
      const res = await fetch(`/api/integrative-therapist/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : t("it.appt.statusError"));
        return;
      }
      onStatusChange?.(appointmentId, data.appointment.status);
      toast.success(
        action === "confirm" ? t("it.appt.confirmSuccess") : t("it.appt.completeSuccess"),
      );
    } catch {
      toast.error(t("it.appt.statusError"));
    } finally {
      setLoading(null);
    }
  }

  if (!showConfirm && !showComplete) return null;

  const btnClass = compact
    ? "w-full sm:w-auto text-center text-xs font-bold px-3 py-2.5 rounded-xl min-h-[44px] inline-flex items-center justify-center disabled:opacity-50"
    : "text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50";

  return (
    <>
      {showConfirm && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void runAction("confirm")}
          className={`${btnClass} bg-amber-500 hover:bg-amber-600 text-white`}
        >
          {loading === "confirm" ? <Loader2 size={14} className="animate-spin" /> : t("it.appt.confirm")}
        </button>
      )}
      {showComplete && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void runAction("complete")}
          className={`${btnClass} bg-teal-600 hover:bg-teal-700 text-white`}
        >
          {loading === "complete" ? <Loader2 size={14} className="animate-spin" /> : t("it.appt.markComplete")}
        </button>
      )}
    </>
  );
}
