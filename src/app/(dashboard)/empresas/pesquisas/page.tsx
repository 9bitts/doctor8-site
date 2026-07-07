"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Copy, ExternalLink, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { dimensionRiskLevel } from "@/lib/nr1-survey-report";

type Campaign = {
  id: string;
  title: string;
  instrument: string;
  status: string;
  publicToken: string;
  _count: { responses: number };
};

type Report = {
  totalResponses: number;
  minGroupSize: number;
  meetsAnonymityThreshold: boolean;
  overallDimensions: Record<string, number>;
  byDepartment: Array<{
    department: string;
    count: number;
    dimensions: Record<string, number>;
  }>;
};

function riskColor(level: string) {
  if (level === "high") return "bg-red-100 text-red-800";
  if (level === "medium") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function PesquisasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Pesquisa psicossocial — COPSOQ-lite");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/surveys");
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/employer/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, instrument: "COPSOQ-LITE" }),
    });
    load();
  }

  async function activate(id: string) {
    await fetch("/api/employer/surveys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "ACTIVE", startsAt: new Date().toISOString() }),
    });
    load();
  }

  async function loadReport(id: string) {
    if (reports[id]) {
      setExpandedId(expandedId === id ? null : id);
      return;
    }
    setLoadingReport(id);
    const res = await fetch(`/api/employer/surveys/${id}/report`);
    const data = await res.json();
    if (res.ok) {
      setReports((prev) => ({ ...prev, [id]: data.report }));
      setExpandedId(id);
    }
    setLoadingReport(null);
  }

  function surveyUrl(token: string) {
    if (typeof window === "undefined") return `/empresas/pesquisa/${token}`;
    return `${window.location.origin}/empresas/pesquisa/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(surveyUrl(token));
    alert("Link copiado!");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pesquisas organizacionais</h1>
        <p className="text-slate-500 text-sm mt-1">
          Instrumentos validados com anonimato — avaliam condições de trabalho, não saúde mental individual.
        </p>
      </div>

      <form onSubmit={createCampaign} className="rounded-2xl border border-slate-200 bg-white p-6 flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Criar
        </button>
      </form>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {c.instrument} · {c.status} · {c._count.responses} respostas
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  {c._count.responses > 0 && (
                    <button
                      type="button"
                      onClick={() => loadReport(c.id)}
                      className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
                    >
                      {loadingReport === c.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <BarChart3 size={14} />
                      )}
                      Relatório
                      {expandedId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                  {c.status === "DRAFT" && (
                    <button type="button" onClick={() => activate(c.id)} className="text-sm text-sky-600 hover:underline">
                      Ativar
                    </button>
                  )}
                  {c.status === "ACTIVE" && (
                    <>
                      <button type="button" onClick={() => copyLink(c.publicToken)} className="text-slate-500 hover:text-sky-600">
                        <Copy size={18} />
                      </button>
                      <a href={surveyUrl(c.publicToken)} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-sky-600">
                        <ExternalLink size={18} />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {expandedId === c.id && reports[c.id] && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  {!reports[c.id].meetsAnonymityThreshold ? (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                      Mínimo de {reports[c.id].minGroupSize} respostas para exibir agregados (anonimato).
                      Atual: {reports[c.id].totalResponses}.
                    </p>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Dimensões (geral)</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(reports[c.id].overallDimensions).map(([dim, score]) => {
                            const level = dimensionRiskLevel(score);
                            return (
                              <span key={dim} className={`text-xs px-2 py-1 rounded-full ${riskColor(level)}`}>
                                {dim}: {score}%
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {reports[c.id].byDepartment.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase mb-2">Por setor</p>
                          <div className="space-y-2">
                            {reports[c.id].byDepartment.map((d) => (
                              <div key={d.department} className="text-sm bg-slate-50 rounded-lg p-3">
                                <p className="font-medium text-slate-800">{d.department} ({d.count} respostas)</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(d.dimensions).map(([dim, score]) => (
                                    <span key={dim} className={`text-xs px-1.5 py-0.5 rounded ${riskColor(dimensionRiskLevel(score))}`}>
                                      {dim}: {score}%
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
