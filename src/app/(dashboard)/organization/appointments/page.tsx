"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Calendar, MessageCircle } from "lucide-react";
import { readOrgProviderScopeCookie } from "@/lib/work-context";
import {
  formatShortDateWithWeekday,
  formatAppointmentTimeWithLabel,
  DEFAULT_TIME_ZONE,
} from "@/lib/timezone";

/** Brazilian organizations — appointment display uses America/Sao_Paulo. */
const ORG_APPT_TZ = DEFAULT_TIME_ZONE;
const ORG_APPT_LOCALE = "pt-BR";

type Appt = {
  id: string;
  scheduledAt: string;
  status: string;
  patientName: string;
  professionalName: string;
  specialty: string;
};

export default function OrganizationAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [waResult, setWaResult] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const scopeKey = readOrgProviderScopeCookie();
    if (scopeKey) params.set("providerScope", scopeKey);
    const res = await fetch(`/api/organization/appointments?${params}`);
    const data = await res.json();
    if (res.ok) setAppointments(data.appointments || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const onScope = () => load();
    window.addEventListener("doctor8-org-scope-change", onScope);
    return () => window.removeEventListener("doctor8-org-scope-change", onScope);
  }, [load]);

  async function sendWhatsApp(id: string) {
    setSendingId(id);
    try {
      const res = await fetch(`/api/organization/appointments/${id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "confirmation" }),
      });
      const data = await res.json();
      if (data.waUrl && data.status === "SKIPPED") {
        window.open(data.waUrl, "_blank");
        setWaResult((prev) => ({ ...prev, [id]: "WhatsApp Web aberto" }));
      } else if (data.status === "SENT") {
        setWaResult((prev) => ({ ...prev, [id]: "Enviado!" }));
      } else if (data.error === "NO_PHONE") {
        setWaResult((prev) => ({ ...prev, [id]: "Sem telefone" }));
      } else {
        setWaResult((prev) => ({ ...prev, [id]: "Falha no envio" }));
      }
    } finally {
      setSendingId(null);
    }
  }

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
        <p className="text-slate-500 text-sm mt-1">Proximos 14 dias - confirmacao via WhatsApp</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Nenhuma consulta no periodo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {appointments.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{a.patientName}</p>
                <p className="text-sm text-slate-500">
                  {a.professionalName}
                  {a.specialty ? ` - ${a.specialty}` : ""}
                </p>
                {waResult[a.id] && (
                  <p className="text-xs text-indigo-600 mt-0.5">{waResult[a.id]}</p>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 flex-wrap">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">
                    {formatShortDateWithWeekday(new Date(a.scheduledAt), ORG_APPT_TZ, ORG_APPT_LOCALE)}
                    {" - "}
                    {formatAppointmentTimeWithLabel(new Date(a.scheduledAt), ORG_APPT_TZ, ORG_APPT_LOCALE)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[a.status] || "bg-slate-100 text-slate-600"}`}>
                    {a.status}
                  </span>
                </div>
                {["CONFIRMED", "PENDING"].includes(a.status) && (
                  <button
                    onClick={() => sendWhatsApp(a.id)}
                    disabled={sendingId === a.id}
                    title="Enviar confirmacao WhatsApp"
                    className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                  >
                    {sendingId === a.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <MessageCircle size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
