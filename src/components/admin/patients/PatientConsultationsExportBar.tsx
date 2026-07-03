"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function PatientConsultationsExportBar() {
  const [consultFrom, setConsultFrom] = useState(weekAgoIso());
  const [consultTo, setConsultTo] = useState(todayIso());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadCsv() {
    if (!consultFrom || !consultTo) {
      setError("Informe as datas do periodo");
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ consultFrom, consultTo });
      const res = await fetch(`/api/admin/patients/export?${qs}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Erro ao exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atendimentos_${consultFrom}_${consultTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro ao exportar");
    }
    setDownloading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Exportar atendimentos</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Filtre por data e baixe CSV com nome, telefone, data do atendimento e profissional
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Atendimentos de</span>
          <input
            type="date"
            value={consultFrom}
            onChange={(e) => setConsultFrom(e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Ate</span>
          <input
            type="date"
            value={consultTo}
            onChange={(e) => setConsultTo(e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2 rounded-xl transition"
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Baixar CSV
        </button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
