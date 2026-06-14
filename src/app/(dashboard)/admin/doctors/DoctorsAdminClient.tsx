"use client";

// src/app/(dashboard)/admin/doctors/DoctorsAdminClient.tsx
import { useState, useEffect } from "react";
import { Stethoscope, Loader2, CheckCircle2, XCircle, Search } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  email: string | null;
  region: string | null;
  specialty: string;
  licenseNumber: string;
  licenseCountry: string;
  verified: boolean;
  verifiedAt: string | null;
  appointments: number;
  charts: number;
  createdAt: string;
}

export default function DoctorsAdminClient() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/doctors");
      const data = await res.json();
      if (res.ok) setDoctors(data.doctors || []);
    } catch { /* ignore */ }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleVerified(d: Doctor) {
    setBusyId(d.id);
    try {
      await fetch(`/api/admin/doctors/${d.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !d.verified }),
      });
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  }

  const filtered = doctors.filter((d) =>
    !q || d.name.toLowerCase().includes(q.toLowerCase()) ||
    (d.email || "").toLowerCase().includes(q.toLowerCase()) ||
    d.specialty.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Médicos</h1>
        <p className="text-slate-500 mt-1">{doctors.length} profissionais cadastrados</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou especialidade..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <Stethoscope className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">Nenhum médico encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((d) => (
            <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <Stethoscope size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                  {d.verified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Pendente
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {d.specialty} · {d.email || "sem e-mail"} · {d.region || "—"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Licença {d.licenseNumber} ({d.licenseCountry}) · {d.appointments} consultas · {d.charts} fichas
                </p>
              </div>
              <button onClick={() => toggleVerified(d)} disabled={busyId === d.id}
                className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                  d.verified
                    ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                }`}>
                {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : d.verified ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                {d.verified ? "Desaprovar" : "Aprovar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
