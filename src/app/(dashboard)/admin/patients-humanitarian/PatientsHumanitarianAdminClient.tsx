"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import PatientMonitoringCards from "@/components/admin/patients/PatientMonitoringCards";
import PatientAlertsPanel from "@/components/admin/patients/PatientAlertsPanel";
import PatientFiltersBar, {
  DEFAULT_FILTERS,
  filtersToQuery,
  type PatientFiltersState,
} from "@/components/admin/patients/PatientFiltersBar";
import PatientListTable from "@/components/admin/patients/PatientListTable";
import type { MonitoringListRow } from "@/lib/admin/patient-monitoring";
import PatientConsultationsExportBar from "@/components/admin/patients/PatientConsultationsExportBar";
import LastUpdatedIndicator from "@/components/admin/patients/LastUpdatedIndicator";

const POLL_MS = 12000;
const STORAGE_KEY = "admin-hum-patients-queue-alert-min";

interface ListResponse {
  patients: MonitoringListRow[];
  counters: {
    total: number;
    inQueue: number;
    inConsult: number;
    completedToday: number;
    withProblem: number;
    pendingReview: number;
    pendingAcuraRegistration: number;
  };
  alerts: {
    id: string;
    type: string;
    patientProfileId?: string;
    protocolo?: string;
    patientName: string;
    message: string;
    severity: "warning" | "critical";
  }[];
  filters: {
    countries: string[];
    specialties: string[];
    queueAlertMinutes: number;
  };
  fetchedAt: string;
}

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

export default function PatientsHumanitarianAdminClient() {
  const defaultFilters = useMemo<PatientFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    queueAlertMinutes: 30,
    origin: "humanitarian",
    acquisitionChannel: "DOCTOR8_HUMANITARIAN",
  }), []);

  const [filters, setFilters] = useState<PatientFiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<PatientFiltersState>(defaultFilters);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    const stored = loadStoredAlertMinutes();
    setFilters((f) => ({ ...f, queueAlertMinutes: stored, origin: "humanitarian" }));
    setAppliedFilters((f) => ({ ...f, queueAlertMinutes: stored, origin: "humanitarian" }));
  }, []);

  const fetchData = useCallback(async (f: PatientFiltersState, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = filtersToQuery({ ...f, origin: "humanitarian", acquisitionChannel: "DOCTOR8_HUMANITARIAN" });
      const res = await fetch(`/api/admin/patients?${qs}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setCountries(json.filters?.countries ?? []);
        setSpecialties(json.filters?.specialties ?? []);
      }
    } catch { /* ignore */ }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(appliedFilters);
  }, [appliedFilters, fetchData]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchData(appliedFilters, true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [appliedFilters, fetchData]);

  function applyFilters() {
    try {
      localStorage.setItem(STORAGE_KEY, String(filters.queueAlertMinutes));
    } catch { /* ignore */ }
    setAppliedFilters({ ...filters, origin: "humanitarian", acquisitionChannel: "DOCTOR8_HUMANITARIAN" });
  }

  function filterPendingAcura() {
    // This screen is post-ACURA; keep action as no-op.
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity size={24} className="text-rose-500" />
            Pacientes humanitários
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Lista e monitoramento do atendimento humanitário (cadastro interno Doctor8)
          </p>
        </div>
        <LastUpdatedIndicator
          fetchedAt={data?.fetchedAt ?? null}
          loading={loading && !data}
        />
      </div>

      {data ? (
        <PatientMonitoringCards
          counters={{ ...data.counters, pendingAcuraRegistration: 0 }}
          onFilterPendingAcura={filterPendingAcura}
        />
      ) : (
        <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Carregando contadores...
        </div>
      )}

      <PatientAlertsPanel alerts={data?.alerts ?? []} />

      <PatientConsultationsExportBar />

      <PatientFiltersBar
        filters={filters}
        countries={countries}
        specialties={specialties}
        onChange={(next) => setFilters({ ...next, origin: "humanitarian", acquisitionChannel: "DOCTOR8_HUMANITARIAN" })}
        onApply={applyFilters}
      />

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> Carregando pacientes...
        </div>
      ) : (
        <PatientListTable patients={data?.patients ?? []} />
      )}
    </div>
  );
}

