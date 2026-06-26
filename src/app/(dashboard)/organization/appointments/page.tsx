"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar } from "lucide-react";

type Appt = {
  id: string;
  scheduledAt: string;
  durationMins: number;
  type: string;
  status: string;
  patientName: string;
  professionalName: string;
  specialty: string;
};

export default function OrganizationAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appt[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 14);
      const res = await fetch(
        `/api/organization/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments || []);
      setLoading(false);
    }
    load();
  }, []);

  const statusColor: Record<string, string> = {
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-slate-100 text-slate-600",
    NO_SHOW: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agenda consolidada</h1>
        <p className="text-slate-500 text-sm mt-1">Pr?ximos 14 dias ? todos os profissionais</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Nenhuma consulta no per?odo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-6 py-4 gap-4">
              <div>
                <p className="font-medium text-slate-900">{a.patientName}</p>
                <p className="text-sm text-slate-500">
                  {a.professionalName}
                  {a.specialty ? ` ? ${a.specialty}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-slate-800">
                  {new Date(a.scheduledAt).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                  {" ? "}
                  {new Date(a.scheduledAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[a.status] || "bg-slate-100 text-slate-600"}`}>
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
