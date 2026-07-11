import { CheckCircle2, Clock } from "lucide-react";
import { EmissionCardActions } from "@/components/professional/emissions/EmissionCardActions";
import type { ClinicalDocument } from "./shared";
import { emissionKindFromDoc, isExamDocType } from "./shared";

export function ClinicalDocCard({
  d, locale, t, onReuse, onSign, onPdfError, onRefresh,
}: {
  d: ClinicalDocument; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void; onPdfError: (message: string) => void;
  onRefresh: () => void;
}) {
  const signed = d.signatureStatus === "SIGNED";
  const pending = d.signatureStatus === "PENDING";
  const patientName = d.document?.patient
    ? `${d.document.patient.firstName} ${d.document.patient.lastName}`
    : t("rx.patient");
  const kindLabel = isExamDocType(d.type) ? t("rx.kindExam") : t("rx.kindDocument");
  const kind = emissionKindFromDoc(d.type);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-brand-200 transition">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{kindLabel}</span>
            <p className="font-semibold text-slate-800 truncate">{d.title}</p>
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
          <p className="text-sm text-slate-600 mt-1">{patientName}</p>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(d.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
          {isExamDocType(d.type) && d.examItems && d.examItems.length > 0 && (
            <ol className="mt-2 space-y-0.5">
              {d.examItems.slice(0, 3).map((item, i) => (
                <li key={i} className="text-xs text-slate-600 truncate">{i + 1}. {item}</li>
              ))}
            </ol>
          )}
          {!isExamDocType(d.type) && d.content && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{d.content}</p>
          )}
        </div>
      </div>
      <EmissionCardActions
        kind={kind}
        emissionId={d.id}
        signatureStatus={d.signatureStatus}
        patientNotifiedAt={d.patientNotifiedAt}
        whatsappNotifyStatus={d.whatsappNotifyStatus}
        patientName={patientName}
        examItems={d.examItems}
        title={d.title}
        content={d.content}
        t={t}
        onReuse={onReuse}
        onSign={onSign}
        onPdfError={onPdfError}
        onDelivered={onRefresh}
      />
    </div>
  );
}
