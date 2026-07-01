"use client";

interface Consultation {
  id: string;
  kind: "humanitarian" | "appointment";
  professionalName: string | null;
  specialty: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  status: string;
  hasDocuments: boolean;
  documentIds: string[];
  adminProblemAt: string | null;
}

export default function PatientConsultationsList({
  consultations,
}: {
  consultations: Consultation[];
}) {
  if (consultations.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">Nenhuma consulta registrada.</p>
    );
  }

  return (
    <div className="space-y-2">
      {consultations.map((c) => (
        <div
          key={`${c.kind}-${c.id}`}
          className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-800">
                {c.professionalName ?? "Profissional nao identificado"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.specialty ?? "?"} ?{" "}
                {c.kind === "humanitarian" ? "Humanitario" : "Regular"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {c.status}
              </span>
              {c.adminProblemAt && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Problema
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
            <span>
              {new Date(c.scheduledAt).toLocaleString("pt-BR")}
            </span>
            {c.durationMinutes != null && (
              <span>Duracao: {c.durationMinutes} min</span>
            )}
            <span>
              Documentos: {c.hasDocuments ? `${c.documentIds.length} emitido(s)` : "nenhum"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
