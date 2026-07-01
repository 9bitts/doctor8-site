"use client";

import type { PatientMonitorStatus } from "@/lib/admin/patient-monitoring";

const STATUS_CONFIG: Record<
  PatientMonitorStatus,
  { label: string; className: string }
> = {
  IN_QUEUE: {
    label: "Na fila",
    className: "bg-brand-50 text-brand-600 border border-brand-100",
  },
  IN_CONSULT: {
    label: "Em atendimento",
    className: "bg-emerald-100 text-emerald-700",
  },
  ATTENDED: {
    label: "Atendido",
    className: "bg-slate-100 text-slate-600",
  },
  INACTIVE: {
    label: "Sem atividade",
    className: "bg-slate-50 text-slate-400 border border-slate-200",
  },
  PROBLEM: {
    label: "Problema",
    className: "bg-rose-100 text-rose-700",
  },
};

export default function PatientStatusBadge({
  status,
  detail,
}: {
  status: PatientMonitorStatus;
  detail?: string | null;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.className}`}
      title={detail ?? undefined}
    >
      {cfg.label}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: "humanitarian" | "regular" }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-md ${
        origin === "humanitarian"
          ? "bg-brand-50 text-brand-600 border border-brand-100"
          : "bg-slate-50 text-slate-500 border border-slate-100"
      }`}
    >
      {origin === "humanitarian" ? "Humanitario" : "Regular"}
    </span>
  );
}
