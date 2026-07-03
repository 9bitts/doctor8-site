"use client";

import { useMemo, useState } from "react";

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

function startOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function PatientConsultationsList({
  consultations,
}: {
  consultations: Consultation[];
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return consultations;
    return consultations.filter((c) => {
      const at = new Date(c.scheduledAt);
      if (dateFrom && at < startOfDay(dateFrom)) return false;
      if (dateTo && at > endOfDay(dateTo)) return false;
      return true;
    });
  }, [consultations, dateFrom, dateTo]);

  if (consultations.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">Nenhuma consulta registrada.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-end bg-slate-50 rounded-xl p-3 border border-slate-100">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">De</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 block text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Limpar filtro
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} de {consultations.length} consulta(s)
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          Nenhuma consulta no período selecionado.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
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
                    {c.specialty ?? "?"} ·{" "}
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
                <span>{new Date(c.scheduledAt).toLocaleString("pt-BR")}</span>
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
      )}
    </div>
  );
}
