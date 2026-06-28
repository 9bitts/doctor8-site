"use client";

// src/app/(dashboard)/admin/patients/PatientsAdminClient.tsx
import { useState, useEffect } from "react";
import { Users, Loader2, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Patient {
  id: string;
  name: string;
  email: string | null;
  region: string | null;
  appointments: number;
  documents: number;
  createdAt: string;
}

export default function PatientsAdminClient() {
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/patients");
        const data = await res.json();
        if (res.ok) setPatients(data.patients || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = patients.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.patients.title")}</h1>
        <p className="text-slate-500 mt-1">
          {t("admin.patients.summary").replace("{{count}}", String(patients.length))}
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.patients.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <Users className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("admin.patients.empty")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                {p.name && p.name !== "—" ? p.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.email || t("admin.patients.noEmail")} · {p.region || "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">
                  {t("admin.patients.appointments").replace("{{n}}", String(p.appointments))}
                </p>
                <p className="text-xs text-slate-400">
                  {t("admin.patients.documents").replace("{{n}}", String(p.documents))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
