"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { buildClinicalDocumentWaMeUrl } from "@/lib/whatsapp";
import {
  buildProCancelRescheduleMessage,
  canProfessionalCancelAppointment,
  MESSAGE_DRAFT_STORAGE_KEY,
  type ProCancelAppointmentTarget,
} from "@/lib/pro-cancel-appointment";

type Props = {
  appointment: ProCancelAppointmentTarget;
  portalBase: string;
  timeZone: string;
  onClose: () => void;
  onCancelled: (id: string) => void;
};

export default function ProfessionalCancelAppointmentModal({
  appointment,
  portalBase,
  timeZone,
  onClose,
  onCancelled,
}: Props) {
  const { t, lang } = useI18n();
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const patientName = `${appointment.patientFirstName} ${appointment.patientLastName}`.trim();
  const scheduledAt = new Date(appointment.scheduledAt);

  const rescheduleMessage = useMemo(
    () =>
      buildProCancelRescheduleMessage({
        patientFirstName: appointment.patientFirstName,
        scheduledAt,
        lang,
        timeZone,
      }),
    [appointment.patientFirstName, scheduledAt, lang, timeZone],
  );

  const whatsappUrl = useMemo(() => {
    if (!appointment.patientPhone) return null;
    return buildClinicalDocumentWaMeUrl(appointment.patientPhone, rescheduleMessage);
  }, [appointment.patientPhone, rescheduleMessage]);

  const messagesHref = appointment.patientUserId
    ? `${portalBase}/messages?with=${appointment.patientUserId}`
    : null;

  function openDoctorMessage() {
    if (!messagesHref) return;
    try {
      sessionStorage.setItem(
        MESSAGE_DRAFT_STORAGE_KEY,
        JSON.stringify({ userId: appointment.patientUserId, text: rescheduleMessage }),
      );
    } catch {
      /* ignore */
    }
    window.location.href = messagesHref;
  }

  async function confirmCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason.trim() || "Professional requested cancellation",
          cancelledByProfessional: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.error === "string" ? data.error : "";
        if (code === "APPOINTMENT_IN_PROGRESS") {
          setError(t("proappt.cancelInProgress"));
        } else if (code === "APPOINTMENT_TIME_PASSED") {
          setError(t("proappt.cancelTimePassed"));
        } else {
          setError(t("proappt.cancelError"));
        }
        return;
      }
      setDone(true);
      onCancelled(appointment.id);
    } catch {
      setError(t("proappt.cancelError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        {done ? (
          <>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-emerald-100">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-center text-lg">{t("proappt.cancelDone")}</h3>
            <p className="text-sm text-slate-600 text-center">{t("proappt.cancelDoneHint")}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold"
            >
              {t("appt.close")}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                {t("proappt.cancelTitle")}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 shrink-0"
                aria-label={t("appt.back")}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-700">{t("proappt.cancelNotifyHint")}</p>

            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-brand-800">{patientName}</p>
              <p className="text-xs text-slate-600 whitespace-pre-wrap">{rescheduleMessage}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold transition"
                  >
                    <MessageCircle size={16} />
                    {t("proappt.cancelWhatsapp")}
                  </a>
                ) : (
                  <p className="flex-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    {t("wa.noPhone")}
                  </p>
                )}
                {messagesHref ? (
                  <button
                    type="button"
                    onClick={openDoctorMessage}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 text-sm font-semibold transition"
                  >
                    <MessageCircle size={16} />
                    {t("proappt.cancelDoctorMessage")}
                  </button>
                ) : (
                  <p className="flex-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    {t("proappt.cancelNoPatientAccount")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                {t("appt.cancelReasonLabel")}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder={t("proappt.cancelReasonPlaceholder")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm"
              >
                {t("appt.back")}
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {t("proappt.cancelConfirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ProCancelAppointmentButton({
  appointment,
  portalBase,
  timeZone,
  onCancelled,
  className = "",
}: {
  appointment: ProCancelAppointmentTarget;
  portalBase: string;
  timeZone: string;
  onCancelled?: (id: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!canProfessionalCancelAppointment(appointment)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "shrink-0 text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50 rounded-xl px-3 py-2 hover:bg-rose-100 transition"
        }
      >
        {t("proappt.cancelBtn")}
      </button>
      {open && (
        <ProfessionalCancelAppointmentModal
          appointment={appointment}
          portalBase={portalBase}
          timeZone={timeZone}
          onClose={() => setOpen(false)}
          onCancelled={(id) => {
            onCancelled?.(id);
          }}
        />
      )}
    </>
  );
}
