"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";
import PatientStatusBadge, { OriginBadge } from "@/components/admin/patients/PatientStatusBadge";
import type { PatientMonitorStatus } from "@/lib/admin/patient-monitoring";

export interface PatientRow {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phoneHint: string | null;
  country: string | null;
  origin: "humanitarian" | "regular";
  status: PatientMonitorStatus;
  statusDetail: string | null;
  registeredAt: string;
  lastSpecialty: string | null;
  appointments: number;
  documents: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PatientListTable({ patients }: { patients: PatientRow[] }) {
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/patients/${p.id}`}
                    className="font-semibold text-slate-800 hover:text-brand-600"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.email ?? "sem e-mail"}
                    {p.phoneHint ? ` ? ${p.phoneHint}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.country ?? "?"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {formatDate(p.registeredAt)}
                </td>
                <td className="px-4 py-3">
                  <OriginBadge origin={p.origin} />
                </td>
                <td className="px-4 py-3">
                  <PatientStatusBadge status={p.status} detail={p.statusDetail} />
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">
                  {p.lastSpecialty ?? "?"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <AdminViewPhoneButton userId={p.userId} />
                    <Link
                      href={`/admin/patients/${p.id}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      Detalhe
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {patients.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/admin/patients/${p.id}`}
                  className="font-semibold text-slate-800 text-sm"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {p.email ?? "sem e-mail"}
                </p>
              </div>
              <PatientStatusBadge status={p.status} detail={p.statusDetail} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <OriginBadge origin={p.origin} />
              <span>{p.country ?? "?"}</span>
              <span>{formatDate(p.registeredAt)}</span>
            </div>
            <div className="flex gap-2">
              <AdminViewPhoneButton userId={p.userId} />
              <Link
                href={`/admin/patients/${p.id}`}
                className="flex-1 text-center text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
              >
                Ver detalhe
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
