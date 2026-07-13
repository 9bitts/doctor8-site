"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import PatientJourneyStepper from "@/components/admin/patients/PatientJourneyStepper";
import AcuraIntakePanel from "@/components/admin/patients/AcuraIntakePanel";
import PatientTimeline from "@/components/admin/patients/PatientTimeline";
import PatientStatusBadge, { AcquisitionBadge } from "@/components/admin/patients/PatientStatusBadge";
import LastUpdatedIndicator from "@/components/admin/patients/LastUpdatedIndicator";
import type { UnlinkedIntakeDetailDto } from "@/lib/admin/patient-monitoring";
import AdminContactWhatsAppActions from "@/components/admin/AdminContactWhatsAppActions";

const POLL_MS = 12000;
const STORAGE_KEY = "admin-patients-queue-alert-min";

function loadStoredAlertMinutes(): number {
  if (typeof window === "undefined") return 30;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n >= 5) return n;
    }
  } catch { /* ignore */ }
  return 30;
}

export default function AcuraIntakeDetailClient({ protocolo }: { protocolo: string }) {
  const router = useRouter();
  const [intake, setIntake] = useState<UnlinkedIntakeDetailDto | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const alertMin = loadStoredAlertMinutes();
      const res = await fetch(
        `/api/admin/patients/acura/${encodeURIComponent(protocolo)}?queueAlertMinutes=${alertMin}`,
      );
      const json = await res.json();
      if (res.ok) {
        if (json.redirectTo) {
          router.replace(json.redirectTo);
          return;
        }
        setIntake(json.intake);
        setFetchedAt(json.fetchedAt);
      }
    } catch { /* ignore */ }
    if (!silent) setLoading(false);
  }, [protocolo, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !intake) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-20 justify-center">
        <Loader2 size={18} className="animate-spin" /> Carregando solicitud ACURA...
      </div>
    );
  }

  if (!intake) {
    return (
      <div className="text-center py-20 text-slate-500 text-sm">
        Solicitud ACURA não encontrada.
      </div>
    );
  }

  const primaryAlert = intake.stuckAlerts[0]?.message ?? intake.statusDetail;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/patients"
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <ArrowLeft size={16} /> Voltar à lista
        </Link>
        <LastUpdatedIndicator fetchedAt={fetchedAt} loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{intake.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{intake.email}</p>
            {intake.acuraIntake.phoneDisplay && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-slate-600">{intake.acuraIntake.phoneDisplay}</p>
                <AdminContactWhatsAppActions
                  phone={intake.acuraIntake.phoneDisplay}
                  displayName={intake.name}
                  layout="inline"
                />
              </div>
            )}
            <p className="text-xs text-violet-600 font-mono mt-1">{intake.protocolo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AcquisitionBadge channel="ACURA_SOS_FORM" />
            <PatientStatusBadge status={intake.status} detail={intake.statusDetail} />
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2 text-sm text-amber-900">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">Sem conta Doctor8</p>
            <p className="text-xs mt-0.5 text-amber-800">{primaryAlert}</p>
            <p className="text-xs mt-1 text-amber-700">
              Formulário enviado em{" "}
              {new Date(intake.registeredAt).toLocaleString("pt-BR")}. O paciente precisa concluir
              o cadastro na Doctor8 com o mesmo e-mail para continuar a jornada.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Jornada do paciente</p>
          <PatientJourneyStepper
            steps={intake.journey.steps}
            currentStep={intake.journey.currentStep}
          />
        </div>
      </div>

      {intake.stuckAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">Alertas</h2>
          <ul className="space-y-1">
            {intake.stuckAlerts.map((alert) => (
              <li key={alert.id} className="text-sm text-slate-600 flex items-start gap-2">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-rose-500" : "bg-amber-400"
                  }`}
                />
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AcuraIntakePanel intake={intake.acuraIntake} />

      {intake.timeline.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Linha do tempo</h2>
          <PatientTimeline events={intake.timeline} />
        </section>
      )}
    </div>
  );
}
