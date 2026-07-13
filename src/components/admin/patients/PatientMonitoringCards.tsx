"use client";

interface MonitoringCounters {
  total: number;
  inQueue: number;
  inConsult: number;
  completedToday: number;
  withProblem: number;
  pendingReview: number;
  pendingAcuraRegistration: number;
}

export default function PatientMonitoringCards({
  counters,
  onFilterPendingAcura,
}: {
  counters: MonitoringCounters;
  onFilterPendingAcura?: () => void;
}) {
  const cards = [
    { label: "Total de pacientes", value: counters.total, accent: "text-slate-800" },
    {
      label: "Sem cadastro completo",
      value: counters.pendingAcuraRegistration,
      accent: "text-amber-600",
      onClick: onFilterPendingAcura,
    },
    { label: "Na fila agora", value: counters.inQueue, accent: "text-brand-600" },
    { label: "Em atendimento", value: counters.inConsult, accent: "text-emerald-600" },
    { label: "Concluidos hoje", value: counters.completedToday, accent: "text-brand-600" },
    { label: "Com problema", value: counters.withProblem, accent: "text-rose-600" },
    { label: "Conferencia pendente", value: counters.pendingReview, accent: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cards.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.onClick}
          disabled={!c.onClick}
          className={`bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-left ${
            c.onClick ? "hover:border-amber-200 hover:bg-amber-50/30 transition cursor-pointer" : ""
          }`}
        >
          <p className="text-xs text-slate-500 font-medium">{c.label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${c.accent}`}>{c.value}</p>
        </button>
      ))}
    </div>
  );
}
