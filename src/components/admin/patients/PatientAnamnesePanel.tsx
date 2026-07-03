"use client";

import { FileText } from "lucide-react";
import HumanitarianIntakeSummary from "@/components/humanitarian/HumanitarianIntakeSummary";
import type { PatientDetailDto } from "@/lib/admin/patient-monitoring";

export default function PatientAnamnesePanel({
  anamnese,
}: {
  anamnese: PatientDetailDto["anamnese"];
}) {
  if (!anamnese) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={18} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Anamnese inicial</h2>
        </div>
        <p className="text-sm text-slate-400">Este paciente ainda não preencheu a anamnese inicial.</p>
      </section>
    );
  }

  const statusLabel =
    anamnese.anamneseComplete
      ? "Completa"
      : anamnese.status === "PARTIAL"
        ? "Parcial"
        : "Somente triagem";

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-800">Anamnese inicial</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {statusLabel}
          </span>
          {anamnese.submittedAt && (
            <span className="text-slate-400">
              {new Date(anamnese.submittedAt).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      <HumanitarianIntakeSummary
        summary={anamnese}
        lang="pt"
      />
    </section>
  );
}
