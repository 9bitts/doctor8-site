"use client";

import { Phone } from "lucide-react";
import {
  ACURA_STATUS_LABELS,
  partnerIntakeWhatsAppHref,
  type AcuraIntakeAdminDto,
} from "@/lib/partner/acura-intake";
import type { PartnerIntakeStatus } from "@prisma/client";

function fmtTs(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export default function AcuraIntakePanel({ intake }: { intake: AcuraIntakeAdminDto }) {
  const statusLabel =
    ACURA_STATUS_LABELS[intake.acuraStatus as PartnerIntakeStatus] ?? intake.acuraStatus;
  const whatsappHref = partnerIntakeWhatsAppHref(intake.phoneDisplay);

  return (
    <section className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Solicitud ACURA — SOS Venezuela</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{intake.protocolo}</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Solicitante</p>
          <p className="text-slate-800">{intake.requesterName}</p>
          <p className="text-xs text-slate-500">{intake.email}</p>
          {intake.phoneDisplay ? (
            <p className="text-xs mt-1 flex items-center gap-1.5">
              <Phone size={12} className="text-slate-400 shrink-0" />
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                  title="Abrir WhatsApp"
                >
                  {intake.phoneDisplay}
                </a>
              ) : (
                <span className="text-slate-600">{intake.phoneDisplay}</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Telefone não informado no formulário</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Paciente</p>
          <p className="text-slate-800">
            {intake.patientName}
            {intake.age ? `, ${intake.age}a` : ""}
          </p>
          <p className="text-xs text-slate-500">{intake.location}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Prioridade</p>
          <p className="text-slate-800 capitalize">{intake.priority || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Tipo de atención</p>
          <p className="text-slate-800">{intake.careType || "—"}</p>
        </div>
        {intake.referralSource && (
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-400 uppercase font-semibold">Origem (UTM)</p>
            <p className="text-slate-800 text-xs break-all">{intake.referralSource}</p>
          </div>
        )}
        {intake.assignedVolunteerLabel && (
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Voluntário triagem</p>
            <p className="text-slate-800">{intake.assignedVolunteerLabel}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Enviado em</p>
          <p className="text-slate-800">{fmtTs(intake.submittedAt)}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Síntomas</p>
          <p className="text-slate-700 whitespace-pre-wrap text-xs leading-relaxed">{intake.symptoms}</p>
        </div>
        {intake.notes && (
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Observaciones</p>
            <p className="text-slate-700 whitespace-pre-wrap text-xs">{intake.notes}</p>
          </div>
        )}
        {intake.triageNotes && (
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Notas triagem ACURA</p>
            <p className="text-slate-700 whitespace-pre-wrap text-xs">{intake.triageNotes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className={`rounded-lg px-3 py-2 border ${intake.clicks.doctor8RegisterAt ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
          Doctor8 cadastro: {fmtTs(intake.clicks.doctor8RegisterAt)}
        </div>
        <div className={`rounded-lg px-3 py-2 border ${intake.clicks.doctor8LoginAt ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
          Doctor8 login: {fmtTs(intake.clicks.doctor8LoginAt)}
        </div>
        <div className={`rounded-lg px-3 py-2 border ${intake.clicks.whatsappHelpAt ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
          WhatsApp ajuda: {fmtTs(intake.clicks.whatsappHelpAt)}
        </div>
      </div>

      {intake.doctor8EmailCheckedAt && (
        <p className="text-xs text-slate-500">
          Verificação Doctor8: {fmtTs(intake.doctor8EmailCheckedAt)} — {intake.doctor8EmailStatus ?? "—"}
          {intake.doctor8RegisteredFlag ? " (confirmado)" : ""}
        </p>
      )}
    </section>
  );
}
