"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, Users } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await fetch(`/api/organization/patients${params}`);
    const data = await res.json();
    if (res.ok) setPatients(data.patients || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
        <p className="text-slate-500 text-sm mt-1">Vis\u00e3o consolidada de todos os profissionais</p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail\u2026"
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
          <p className="text-slate-500">Nenhum paciente encontrado.</p>
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
                  {p.specialty ? ` \u00b7 ${p.specialty}` : ""}
                </p>
                {p.email && <p className="text-xs text-slate-400 mt-0.5">{p.email}</p>}
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                {p.appointmentCount} consulta{p.appointmentCount !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
