"use client";

import { Search } from "lucide-react";
import type { PatientMonitorStatus } from "@/lib/admin/patient-monitoring";

export interface PatientFiltersState {
  q: string;
  status: PatientMonitorStatus | "";
  country: string;
  origin: "" | "humanitarian" | "regular";
  registeredFrom: string;
  registeredTo: string;
  lastSpecialty: string;
  sort: "newest" | "oldest" | "lastActivity";
  queueAlertMinutes: number;
  reviewed: "" | "yes" | "no";
}

interface PatientFiltersBarProps {
  filters: PatientFiltersState;
  countries: string[];
  specialties: string[];
  onChange: (next: PatientFiltersState) => void;
  onApply: () => void;
}

export default function PatientFiltersBar({
  filters,
  countries,
  specialties,
  onChange,
  onApply,
}: PatientFiltersBarProps) {
  function set<K extends keyof PatientFiltersState>(key: K, value: PatientFiltersState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApply()}
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
          <select
            value={filters.status}
            onChange={(e) => set("status", e.target.value as PatientMonitorStatus | "")}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="IN_QUEUE">Na fila</option>
            <option value="IN_CONSULT">Em atendimento</option>
            <option value="ATTENDED">Atendido</option>
            <option value="INACTIVE">Sem atividade</option>
            <option value="PROBLEM">Problema</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pais</span>
          <select
            value={filters.country}
            onChange={(e) => set("country", e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Origem</span>
          <select
            value={filters.origin}
            onChange={(e) =>
              set("origin", e.target.value as PatientFiltersState["origin"])
            }
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">Todas</option>
            <option value="humanitarian">Humanitario</option>
            <option value="regular">Regular</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Ordenacao</span>
          <select
            value={filters.sort}
            onChange={(e) => set("sort", e.target.value as PatientFiltersState["sort"])}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="newest">Cadastro mais recente</option>
            <option value="oldest">Cadastro mais antigo</option>
            <option value="lastActivity">Ultima atividade</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Cadastro de</span>
          <input
            type="date"
            value={filters.registeredFrom}
            onChange={(e) => set("registeredFrom", e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Cadastro at?</span>
          <input
            type="date"
            value={filters.registeredTo}
            onChange={(e) => set("registeredTo", e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Especialidade</span>
          <select
            value={filters.lastSpecialty}
            onChange={(e) => set("lastSpecialty", e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">Todas</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Conferido</span>
          <select
            value={filters.reviewed}
            onChange={(e) =>
              set("reviewed", e.target.value as PatientFiltersState["reviewed"])
            }
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="yes">Já conferido</option>
            <option value="no">Pendente</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Alerta fila (min)
          </span>
          <input
            type="number"
            min={5}
            max={180}
            value={filters.queueAlertMinutes}
            onChange={(e) =>
              set("queueAlertMinutes", parseInt(e.target.value, 10) || 30)
            }
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl transition"
      >
        Aplicar filtros
      </button>
    </div>
  );
}

export const DEFAULT_FILTERS: PatientFiltersState = {
  q: "",
  status: "",
  country: "",
  origin: "",
  registeredFrom: "",
  registeredTo: "",
  lastSpecialty: "",
  sort: "newest",
  queueAlertMinutes: 30,
  reviewed: "",
};

export function filtersToQuery(f: PatientFiltersState): string {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.status) qs.set("status", f.status);
  if (f.country) qs.set("country", f.country);
  if (f.origin) qs.set("origin", f.origin);
  if (f.registeredFrom) qs.set("registeredFrom", f.registeredFrom);
  if (f.registeredTo) qs.set("registeredTo", f.registeredTo);
  if (f.lastSpecialty) qs.set("lastSpecialty", f.lastSpecialty);
  if (f.sort !== "newest") qs.set("sort", f.sort);
  if (f.queueAlertMinutes !== 30) qs.set("queueAlertMinutes", String(f.queueAlertMinutes));
  if (f.reviewed) qs.set("reviewed", f.reviewed);
  return qs.toString();
}
