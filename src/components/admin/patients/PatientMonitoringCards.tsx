"use client";

interface MonitoringCounters {
  total: number;
  inQueue: number;
  inConsult: number;
  completedToday: number;
  withProblem: number;
  pendingReview: number;
}

export default function PatientMonitoringCards({
  counters,
}: {
  counters: MonitoringCounters;
}) {
  const cards = [
    { label: "Total de pacientes", value: counters.total, accent: "text-slate-800" },
    { label: "Na fila agora", value: counters.inQueue, accent: "text-brand-600" },
    { label: "Em atendimento", value: counters.inConsult, accent: "text-emerald-600" },
    { label: "Concluidos hoje", value: counters.completedToday, accent: "text-brand-600" },
    { label: "Com problema", value: counters.withProblem, accent: "text-rose-600" },
    { label: "Conferencia pendente", value: counters.pendingReview, accent: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3"
        >
          <p className="text-xs text-slate-500 font-medium">{c.label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${c.accent}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
