"use client";

import { useEffect, useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import { DocumentSignSection } from "@/components/employer/DocumentSignSection";

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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingGro, setExportingGro] = useState(false);
  const [exportingDossier, setExportingDossier] = useState(false);
  const [lastExport, setLastExport] = useState<object | null>(null);
  const [dossierGaps, setDossierGaps] = useState<string[]>([]);

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

  async function exportGroCriteria() {
    setExportingGro(true);
    const res = await fetch("/api/employer/documents/gro-criteria", { method: "POST" });
    const data = await res.json();
    setExportingGro(false);
    load();
    if (data.export) {
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gro-criterios-nr1-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const res = await fetch("/api/employer/documents/pdf");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pgr-inventario-nr1-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  }

  async function exportDossier() {
    setExportingDossier(true);
    setDossierGaps([]);
    const res = await fetch("/api/employer/documents/dossier", { method: "POST" });
    const data = await res.json();
    setExportingDossier(false);
    load();
    if (data.export) {
      setLastExport(data.export);
      setDossierGaps(data.export.evidenceChecklist?.gaps ?? []);
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dossie-conformidade-nr1-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documentação NR-1</h1>
        <p className="text-slate-500 text-sm mt-1">
          Inventário PGR, critérios GRO, AEP, plano de ação e dossiê de conformidade (FAQ MTE 2026).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportDossier}
          disabled={exportingDossier}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white font-medium disabled:opacity-50"
        >
          {exportingDossier ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          Dossiê conformidade (JSON)
        </button>
        <button
          type="button"
          onClick={exportPgr}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 text-white font-medium disabled:opacity-50"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          Inventário PGR (JSON)
        </button>
        <button
          type="button"
          onClick={exportGroCriteria}
          disabled={exportingGro}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-sky-600 text-sky-700 font-medium disabled:opacity-50"
        >
          {exportingGro ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          Critérios GRO (JSON)
        </button>
        <button
          type="button"
          onClick={exportPdf}
          disabled={exportingPdf}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium disabled:opacity-50"
        >
          {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          PGR (PDF)
        </button>
      </div>

      {lastExport && (
        <p className="text-sm text-emerald-700">Exportação gerada e salva no histórico.</p>
      )}
      {dossierGaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-1">
          <p className="font-medium">Lacunas para auditoria MTE</p>
          <ul className="list-disc pl-5">
            {dossierGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      <DocumentSignSection />

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm bg-white flex justify-between gap-4">
              <span>{d.title} <span className="text-slate-400">({d.docType})</span></span>
              <span className="text-slate-400 shrink-0">{new Date(d.exportedAt).toLocaleString("pt-BR")}</span>
            </li>
          ))}
          {docs.length === 0 && <p className="text-slate-400 text-sm">Nenhuma exportação ainda.</p>}
        </ul>
      )}
    </div>
  );
}
