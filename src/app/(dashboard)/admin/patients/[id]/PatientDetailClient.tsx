"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";
import AdminAccountActions from "@/components/admin/AdminAccountActions";
import PatientStatusBadge, { AcquisitionBadge } from "@/components/admin/patients/PatientStatusBadge";
import PatientJourneyStepper from "@/components/admin/patients/PatientJourneyStepper";
import AcuraIntakePanel from "@/components/admin/patients/AcuraIntakePanel";
import PatientLiveStatusPanel from "@/components/admin/patients/PatientLiveStatusPanel";
import PatientTimeline from "@/components/admin/patients/PatientTimeline";
import PatientConsultationsList from "@/components/admin/patients/PatientConsultationsList";
import PatientAdminActions from "@/components/admin/patients/PatientAdminActions";
import PatientAdminReviewPanel from "@/components/admin/patients/PatientAdminReviewPanel";
import PatientAnamnesePanel from "@/components/admin/patients/PatientAnamnesePanel";
import LastUpdatedIndicator from "@/components/admin/patients/LastUpdatedIndicator";
import type { PatientDetailDto } from "@/lib/admin/patient-monitoring";

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

export default function PatientDetailClient({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientDetailDto | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const alertMin = loadStoredAlertMinutes();
      const res = await fetch(
        `/api/admin/patients/${patientId}?queueAlertMinutes=${alertMin}`,
      );
      const json = await res.json();
      if (res.ok) {
        setPatient(json.patient);
        setFetchedAt(json.fetchedAt);
      }
    } catch { /* ignore */ }
    if (!silent) setLoading(false);
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !patient) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-20 justify-center">
        <Loader2 size={18} className="animate-spin" /> Carregando paciente...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20 text-slate-500 text-sm">
        Paciente nao encontrado.
      </div>
    );
  }

  const activeEntryId =
    patient.activeQueue && ["WAITING", "CALLED"].includes(patient.activeQueue.status)
      ? patient.activeQueue.id
      : null;

  const markProblemKind =
    patient.liveConsult?.kind ??
    (activeEntryId ? ("humanitarian" as const) : null);
  const markProblemId = patient.liveConsult?.id ?? activeEntryId;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/patients"
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <ArrowLeft size={16} /> Voltar ? lista
        </Link>
        <LastUpdatedIndicator fetchedAt={fetchedAt} loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-sm text-slate-500 mt-1">{patient.email}</p>
            {patient.acuraIntake && (
              <p className="text-xs text-violet-600 font-mono mt-1">{patient.acuraIntake.protocolo}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PatientStatusBadge status={patient.status} detail={patient.statusDetail} />
            <AcquisitionBadge channel={patient.acquisitionChannel} />
            {patient.adminReviewedAt && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 size={12} /> Conferido
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Pais</p>
            <p className="text-slate-800">{patient.country ?? patient.region}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Idioma</p>
            <p className="text-slate-800">{patient.language}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Cadastro</p>
            <p className="text-slate-800">
              {new Date(patient.registeredAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Telefone</p>
            <p className="text-slate-800">{patient.phoneHint ?? "?"}</p>
          </div>
        </div>

        <AdminViewPhoneButton userId={patient.userId} />

        <AdminAccountActions
          userId={patient.userId}
          emailVerified={patient.emailVerified}
          locked={patient.accountLocked}
          onActionDone={() => load(true)}
        />

        {patient.journeyHighlight && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
            <p className="font-semibold text-xs uppercase mb-1">Trajetoria em atencao</p>
            <p className="text-xs">
              Paciente com historico humanitario JIT e consulta voluntaria agendada futura — acompanhar de perto.
            </p>
          </div>
        )}

        {patient.problemReasons.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-sm text-rose-800">
            <p className="font-semibold text-xs uppercase mb-1">Alertas ativos</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {patient.problemReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Jornada do paciente</h2>
          {patient.acquisitionReferrer && (
            <span className="text-xs text-slate-400 truncate max-w-xs" title={patient.acquisitionReferrer}>
              Entrada: {patient.acquisitionReferrer}
            </span>
          )}
        </div>
        <PatientJourneyStepper steps={patient.journey.steps} currentStep={patient.journey.currentStep} />
      </section>

      <PatientLiveStatusPanel
        activeQueue={patient.activeQueue}
        liveConsult={patient.liveConsult}
      />

      <PatientAdminActions
        patientId={patient.id}
        activeQueueEntryId={activeEntryId}
        queuePosition={patient.activeQueue?.position ?? null}
        liveConsultKind={markProblemKind}
        liveConsultId={markProblemId}
        professionalName={patient.liveConsult?.professionalName ?? null}
        providerTab={patient.liveConsult?.providerTab ?? null}
        onActionDone={() => load(true)}
      />

      {patient.acuraIntake && <AcuraIntakePanel intake={patient.acuraIntake} />}

      <PatientAnamnesePanel anamnese={patient.anamnese} />

      <PatientAdminReviewPanel
        patientId={patient.id}
        initialNote={patient.adminNote}
        initialReviewedAt={patient.adminReviewedAt}
        onSaved={() => load(true)}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Timeline</h2>
        <PatientTimeline events={patient.timeline} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Consultas</h2>
        <PatientConsultationsList
          consultations={patient.consultations}
          onCancelled={() => load(true)}
        />
      </section>
    </div>
  );
}
