"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

const ORIGIN_LABEL: Record<string, string> = {
  humanitarian: "Humanitario JIT",
  volunteer_scheduled: "Voluntario agendado",
  paid: "Consulta paga",
};

interface Consultation {
  id: string;
  kind: "humanitarian" | "appointment";
  origin: "humanitarian" | "volunteer_scheduled" | "paid";
  professionalName: string | null;
  specialty: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  status: string;
  hasDocuments: boolean;
  documentIds: string[];
  adminProblemAt: string | null;
  canCancel?: boolean;
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
  onCancelled,
}: {
  consultations: Consultation[];
  onCancelled?: () => void;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return consultations;
    return consultations.filter((c) => {
      const at = new Date(c.scheduledAt);
      if (dateFrom && at < startOfDay(dateFrom)) return false;
      if (dateTo && at > endOfDay(dateTo)) return false;
      return true;
    });
  }, [consultations, dateFrom, dateTo]);

  async function cancelAppointment(id: string) {
    if (!window.confirm("Cancelar esta consulta como administrador?")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelado pelo administrador" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Falha ao cancelar");
        return;
      }
      onCancelled?.();
    } catch {
      setError("Erro de rede");
    } finally {
      setBusyId(null);
    }
  }

  if (consultations.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">Nenhuma consulta registrada.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-rose-600">{error}</p>}
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
          <span className="text-xs font-semibold text-slate-500 uppercase">Ate</span>
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
          Nenhuma consulta no periodo selecionado.
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
                    {c.specialty ?? "—"} · {ORIGIN_LABEL[c.origin] ?? c.origin}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {c.status}
                  </span>
                  {c.canCancel && c.kind === "appointment" && (
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => void cancelAppointment(c.id)}
                      className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {busyId === c.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                <span>{new Date(c.scheduledAt).toLocaleString("pt-BR")}</span>
                {c.durationMinutes != null && <span>Duracao: {c.durationMinutes} min</span>}
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
