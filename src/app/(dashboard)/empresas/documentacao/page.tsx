"use client";

import { useEffect, useState } from "react";
import { Loader2, FileDown } from "lucide-react";

type Doc = {
  id: string;
  docType: string;
  version: number;
  title: string;
  exportedAt: string;
};

export default function DocumentacaoPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<object | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/documents");
    const data = await res.json();
    setDocs(data.documents ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function exportPgr() {
    setExporting(true);
    const res = await fetch("/api/employer/documents", { method: "POST" });
    const data = await res.json();
    setLastExport(data.export ?? null);
    setExporting(false);
    load();

    if (data.export) {
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pgr-inventario-nr1-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documentação NR-1</h1>
        <p className="text-slate-500 text-sm mt-1">
          Exportação do inventário de riscos, AEP e plano de ação para auditoria / fiscalização MTE.
        </p>
      </div>

      <button
        type="button"
        onClick={exportPgr}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 text-white font-medium disabled:opacity-50"
      >
        {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
        Gerar exportação PGR (JSON)
      </button>

      {lastExport && (
        <p className="text-sm text-emerald-700">Exportação gerada e salva no histórico.</p>
      )}

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm bg-white flex justify-between">
              <span>{d.title}</span>
              <span className="text-slate-400">{new Date(d.exportedAt).toLocaleString("pt-BR")}</span>
            </li>
          ))}
          {docs.length === 0 && <p className="text-slate-400 text-sm">Nenhuma exportação ainda.</p>}
        </ul>
      )}
    </div>
  );
}
