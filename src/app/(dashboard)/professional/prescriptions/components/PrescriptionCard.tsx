import { CheckCircle2, Clock } from "lucide-react";
import { EmissionCardActions } from "@/components/professional/emissions/EmissionCardActions";
import type { MedItem, Prescription } from "./shared";

export function PrescriptionCard({
  p, locale, t, onReuse, onSign, onPdfError, onRefresh, apiBase, hideSign,
}: {
  p: Prescription; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void; onPdfError: (message: string) => void;
  onRefresh: () => void; apiBase: string; hideSign?: boolean;
}) {
  const meds = p.medications as MedItem[];
  const signed = p.signatureStatus === "SIGNED";
  const pending = p.signatureStatus === "PENDING";
  const patientName = p.document?.patient
    ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
    : t("rx.patient");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-brand-200 transition">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800">{patientName}</p>
            {signed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> {t("rx.signed")}
              </span>
            )}
            {pending && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Clock size={11} /> {t("rx.signPending")}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t("rx.issued")} {new Date(p.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
            {p.validUntil && ` · ${t("rx.validUntil")} ${new Date(p.validUntil).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}`}
          </p>
          <ol className="mt-3 space-y-1">
            {meds.slice(0, 4).map((m, i) => (
              <li key={i} className="text-xs text-slate-600 truncate">
                {i + 1}. {m.name}{m.dosage ? ` — ${m.dosage}` : ""}
              </li>
            ))}
            {meds.length > 4 && <li className="text-xs text-slate-400">+{meds.length - 4} {t("rx.more")}</li>}
          </ol>
        </div>
      </div>
      <EmissionCardActions
        kind="prescription"
        emissionId={p.id}
        signatureStatus={p.signatureStatus}
        patientNotifiedAt={p.patientNotifiedAt}
        whatsappNotifyStatus={p.whatsappNotifyStatus}
        patientName={patientName}
        medications={meds}
        t={t}
        onReuse={onReuse}
        onSign={hideSign ? undefined : onSign}
        onPdfError={onPdfError}
        onDelivered={onRefresh}
        apiBase={apiBase}
        hideSign={hideSign}
      />
    </div>
  );
}
