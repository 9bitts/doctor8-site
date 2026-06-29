"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { readOrgProviderScopeCookie } from "@/lib/work-context";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  professionalName: string;
  specialty: string;
  appointmentCount: number;
};

export default function OrganizationPatientsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const scopeKey = readOrgProviderScopeCookie();
    if (scopeKey) params.set("providerScope", scopeKey);
    const qs = params.toString();
    const res = await fetch(`/api/organization/patients${qs ? `?${qs}` : ""}`);
    const data = await res.json();
    if (res.ok) setPatients(data.patients || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  useEffect(() => {
    const onScope = () => load(query);
    window.addEventListener("doctor8-org-scope-change", onScope);
    return () => window.removeEventListener("doctor8-org-scope-change", onScope);
  }, [load, query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("org.patients.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("org.patients.subtitle")}</p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("org.patients.searchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">{t("org.patients.empty")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {patients.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {p.professionalName}
                  {p.specialty ? ` · ${p.specialty}` : ""}
                </p>
                {p.email && <p className="text-xs text-slate-400 mt-0.5">{p.email}</p>}
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                {t("org.patients.appointments").replace("{{n}}", String(p.appointmentCount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
