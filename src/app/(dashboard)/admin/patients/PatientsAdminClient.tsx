"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import PatientMonitoringCards from "@/components/admin/patients/PatientMonitoringCards";
import PatientAlertsPanel from "@/components/admin/patients/PatientAlertsPanel";
import PatientFiltersBar, {
  DEFAULT_FILTERS,
  filtersToQuery,
  type PatientFiltersState,
} from "@/components/admin/patients/PatientFiltersBar";
import PatientListTable, {
  type PatientRow,
} from "@/components/admin/patients/PatientListTable";
import PatientConsultationsExportBar from "@/components/admin/patients/PatientConsultationsExportBar";
import LastUpdatedIndicator from "@/components/admin/patients/LastUpdatedIndicator";

const POLL_MS = 12000;
const STORAGE_KEY = "admin-patients-queue-alert-min";

interface ListResponse {
  patients: PatientRow[];
  counters: {
    total: number;
    inQueue: number;
    inConsult: number;
    completedToday: number;
    withProblem: number;
    pendingReview: number;
  };
  alerts: {
    id: string;
    type: string;
    patientProfileId: string;
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

export default function PatientsAdminClient() {
  const [attentionItems, setAttentionItems] = useState<
    { appointmentId: string; patientProfileId: string; patientFirstName: string; professionalName: string; scheduledAt: string; reason: string }[]
  >([]);

  const loadAttention = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/patients/attention");
      if (res.ok) {
        const data = await res.json();
        setAttentionItems(data.items ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void loadAttention();
  }, [loadAttention]);

  const [filters, setFilters] = useState<PatientFiltersState>({
    ...DEFAULT_FILTERS,
    queueAlertMinutes: 30,
  });
  const [appliedFilters, setAppliedFilters] = useState<PatientFiltersState>(filters);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    const stored = loadStoredAlertMinutes();
    setFilters((f) => ({ ...f, queueAlertMinutes: stored }));
    setAppliedFilters((f) => ({ ...f, queueAlertMinutes: stored }));
  }, []);

  const fetchData = useCallback(async (f: PatientFiltersState, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = filtersToQuery(f);
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
    setAppliedFilters({ ...filters });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity size={24} className="text-brand-500" />
            Monitoramento de pacientes
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Acompanhamento em tempo real do atendimento humanitário e regular
          </p>
        </div>
        <LastUpdatedIndicator
          fetchedAt={data?.fetchedAt ?? null}
          loading={loading && !data}
        />
      </div>

      {data ? (
        <PatientMonitoringCards counters={data.counters} />
      ) : (
        <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Carregando contadores...
        </div>
      )}

      <PatientAlertsPanel alerts={data?.alerts ?? []} />

      {attentionItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Atencao — voluntario agendado</p>
          <ul className="space-y-1 text-xs text-amber-800">
            {attentionItems.slice(0, 8).map((item) => (
              <li key={item.appointmentId}>
                {item.patientFirstName} · {item.professionalName} ·{" "}
                {new Date(item.scheduledAt).toLocaleString("pt-BR")} ·{" "}
                {item.reason === "approval_revoked" ? "aprovacao revogada" : "selo Acura inativo"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PatientConsultationsExportBar />

      <PatientFiltersBar
        filters={filters}
        countries={countries}
        specialties={specialties}
        onChange={setFilters}
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
