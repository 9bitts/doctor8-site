"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Users } from "lucide-react";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";
import PatientStatusBadge, { AcquisitionBadge } from "@/components/admin/patients/PatientStatusBadge";
import type { MonitoringListRow } from "@/lib/admin/patient-monitoring";
import { journeyStepLabel } from "@/lib/admin/patient-journey";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function anamneseLabel(status: string | null): string {
  if (!status) return "Sem anamnese";
  if (status === "COMPLETE") return "Anamnese completa";
  if (status === "PARTIAL") return "Anamnese parcial";
  return "Só triagem";
}

function rowHref(row: MonitoringListRow): string {
  if (row.kind === "unlinked_intake") {
    return `/admin/patients/acura/${encodeURIComponent(row.protocolo)}`;
  }
  return `/admin/patients/${row.id}`;
}

function rowKey(row: MonitoringListRow): string {
  return row.kind === "unlinked_intake" ? `intake-${row.id}` : row.id;
}

export default function PatientListTable({ patients }: { patients: MonitoringListRow[] }) {
  if (patients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
        <Users className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-400 text-sm">Nenhum paciente encontrado</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase">
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Pais</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Anamnese</th>
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3">Atend.</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {patients.map((p) => {
              const isUnlinked = p.kind === "unlinked_intake";
              const href = rowHref(p);
              return (
                <tr
                  key={rowKey(p)}
                  className={`hover:bg-slate-50/80 transition ${
                    isUnlinked && p.stuckAlertCount > 0
                      ? "bg-amber-50/40 border-l-2 border-l-amber-400"
                      : isUnlinked
                        ? "bg-amber-50/20"
                        : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link href={href} className="font-semibold text-slate-800 hover:text-brand-600">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.email ?? "sem e-mail"}
                      {p.phoneHint ? ` · ${p.phoneHint}` : ""}
                    </p>
                    {isUnlinked && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Aguardando D8
                      </span>
                    )}
                    {p.acuraProtocolo && (
                      <p className="text-[10px] text-violet-600 font-mono mt-0.5">
                        {p.acuraProtocolo}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.country ?? "?"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatDate(p.registeredAt)}
                  </td>
                  <td className="px-4 py-3">
                    <AcquisitionBadge channel={p.acquisitionChannel} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="font-medium">{journeyStepLabel(p.currentJourneyStep)}</span>
                    {p.stuckAlertCount > 0 && (
                      <span className="ml-1 text-rose-600">({p.stuckAlertCount})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <PatientStatusBadge status={p.status} detail={p.statusDetail} />
                      {!isUnlinked && p.adminReviewedAt && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 size={11} /> Conferido
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.hasAnamnese ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <FileText size={12} className="text-emerald-500" />
                        {anamneseLabel(p.anamneseStatus)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">
                    {p.lastSpecialty ?? "?"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                    {p.appointments}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!isUnlinked && p.kind === "patient" && (
                        <AdminViewPhoneButton userId={p.userId} />
                      )}
                      <Link
                        href={href}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        Detalhe
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {patients.map((p) => {
          const isUnlinked = p.kind === "unlinked_intake";
          const href = rowHref(p);
          return (
            <div
              key={rowKey(p)}
              className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 ${
                isUnlinked ? "border-amber-200" : "border-slate-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={href} className="font-semibold text-slate-800 text-sm">
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{p.email ?? "sem e-mail"}</p>
                  {isUnlinked && (
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Aguardando D8
                    </span>
                  )}
                </div>
                <PatientStatusBadge status={p.status} detail={p.statusDetail} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <AcquisitionBadge channel={p.acquisitionChannel} />
                <span>{journeyStepLabel(p.currentJourneyStep)}</span>
                {p.stuckAlertCount > 0 && (
                  <span className="text-rose-600">{p.stuckAlertCount} alerta(s)</span>
                )}
                <span>{p.country ?? "?"}</span>
                <span>{formatDate(p.registeredAt)}</span>
              </div>
              <div className="flex gap-2">
                {!isUnlinked && p.kind === "patient" && (
                  <AdminViewPhoneButton userId={p.userId} />
                )}
                <Link
                  href={href}
                  className="flex-1 text-center text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                >
                  Ver detalhe
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
