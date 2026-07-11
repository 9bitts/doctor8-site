"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface MonitoringAlert {
  id: string;
  type: string;
  patientProfileId?: string;
  protocolo?: string;
  patientName: string;
  message: string;
  severity: "warning" | "critical";
}

function alertHref(alert: MonitoringAlert): string {
  if (alert.protocolo) {
    return `/admin/patients/acura/${encodeURIComponent(alert.protocolo)}`;
  }
  if (alert.patientProfileId) {
    return `/admin/patients/${alert.patientProfileId}`;
  }
  return "/admin/patients";
}

export default function PatientAlertsPanel({
  alerts,
}: {
  alerts: MonitoringAlert[];
}) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-sm text-slate-400">
        Nenhum alerta ativo no momento.
      </div>
    );
  }

  const shown = alerts.slice(0, 12);

  return (
    <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-rose-50 flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-500" />
        <h2 className="text-sm font-semibold text-slate-800">
          Alertas ({alerts.length})
        </h2>
      </div>
      <ul className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
        {shown.map((a) => (
          <li key={a.id}>
            <Link
              href={alertHref(a)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-rose-50/50 transition text-sm"
            >
              <span
                className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  a.severity === "critical" ? "bg-rose-500" : "bg-brand-400"
                }`}
              />
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{a.patientName}</p>
                <p className="text-slate-500 text-xs mt-0.5">{a.message}</p>
                {a.protocolo && (
                  <p className="text-[10px] text-violet-600 font-mono mt-0.5">{a.protocolo}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {alerts.length > shown.length && (
        <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-50">
          +{alerts.length - shown.length} alertas adicionais (use filtro &quot;Problema&quot;)
        </p>
      )}
    </div>
  );
}
