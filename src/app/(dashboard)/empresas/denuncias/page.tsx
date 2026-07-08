"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareWarning } from "lucide-react";

type Report = {
  id: string;
  protocolCode: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  internalNotes: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  IN_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
  ARCHIVED: "Arquivada",
};

export default function DenunciasPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/whistleblower");
    const data = await res.json();
    setReports(data.reports ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateReport(id: string, status: string, internalNotes?: string) {
    setSavingId(id);
    await fetch("/api/employer/whistleblower", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, internalNotes }),
    });
    setSavingId(null);
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Canal de denúncias</h1>
        <p className="text-slate-500 text-sm mt-1">
          Protocolos anônimos recebidos via link público. O conteúdo da denúncia não identifica o denunciante.
        </p>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
          Nenhuma denúncia registrada ainda.
        </div>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MessageSquareWarning className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-mono text-sm font-medium text-slate-900">{r.protocolCode}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {r.category} · {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                      {r.description}
                    </p>
                  </div>
                </div>
                <select
                  value={r.status}
                  disabled={savingId === r.id}
                  onChange={(e) => updateReport(r.id, e.target.value, r.internalNotes ?? undefined)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <textarea
                defaultValue={r.internalNotes ?? ""}
                placeholder="Notas internas (SST/RH)…"
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                onBlur={(e) => {
                  if (e.target.value !== (r.internalNotes ?? "")) {
                    updateReport(r.id, r.status, e.target.value);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
