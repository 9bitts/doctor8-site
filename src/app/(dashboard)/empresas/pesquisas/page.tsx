"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Copy, ExternalLink, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { dimensionRiskLevel, SURVEY_INSTRUMENTS } from "@/lib/nr1-survey-report";

type Campaign = {
  id: string;
  title: string;
  instrument: string;
  status: string;
  publicToken: string;
  analyzedAt?: string | null;
  analyzedByName?: string | null;
  _count: { responses: number };
};

type Report = {
  totalResponses: number;
  minGroupSize: number;
  meetsAnonymityThreshold: boolean;
  overallDimensions: Record<string, number>;
  suggestedHazardsOverall: string[];
  byDepartment: Array<{
    department: string;
    count: number;
    dimensions: Record<string, number>;
    suggestedHazards: string[];
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
  const [instrument, setInstrument] = useState("COPSOQ-LITE");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analystName, setAnalystName] = useState("");
  const [techNotes, setTechNotes] = useState("");
  const [remoteIncluded, setRemoteIncluded] = useState(true);
  const [methods, setMethods] = useState<string[]>(["SURVEY", "OBSERVATION"]);
  const [msg, setMsg] = useState("");

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
      body: JSON.stringify({ title, instrument }),
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

  function toggleMethod(m: string) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function saveAnalysis(campaignId: string) {
    setMsg("");
    if (analystName.trim().length < 2 || techNotes.trim().length < 20) {
      setMsg("Informe o responsável e notas técnicas (mín. 20 caracteres).");
      return;
    }
    if (methods.length === 0) {
      setMsg("Selecione ao menos um método complementar à pesquisa.");
      return;
    }
    setAnalyzing(campaignId);
    const res = await fetch(`/api/employer/surveys/${campaignId}/technical-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analyzedByName: analystName.trim(),
        technicalNotes: techNotes.trim(),
        methodsUsed: methods,
        remoteWorkIncluded: remoteIncluded,
      }),
    });
    const data = await res.json();
    setAnalyzing(null);
    if (!res.ok) {
      setMsg(data.error === "ANONYMITY_THRESHOLD" ? "Aguarde o mínimo de respostas." : "Erro ao salvar análise.");
      return;
    }
    setMsg("Análise técnica registrada. Agora você pode importar ao inventário.");
    setTechNotes("");
    load();
  }

  async function importHazards(campaignId: string) {
    setImporting(campaignId);
    setMsg("");
    const res = await fetch(`/api/employer/surveys/${campaignId}/import-hazards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setImporting(null);
    if (res.ok) {
      setMsg(`${data.created?.length ?? 0} risco(s) importado(s) para o inventário NR-1.`);
    } else if (data.error === "TECHNICAL_ANALYSIS_REQUIRED") {
      setMsg(data.message || "Registre a análise técnica antes de importar.");
    } else {
      setMsg(data.error === "ANONYMITY_THRESHOLD" ? "Aguarde o mínimo de respostas anônimas." : "Não foi possível importar.");
    }
  }

  function surveyUrl(token: string) {
    if (typeof window === "undefined") return `/empresas/pesquisa/${token}`;
    return `${window.location.origin}/empresas/pesquisa/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(surveyUrl(token));
    setMsg("Link copiado!");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pesquisas organizacionais</h1>
        <p className="text-slate-500 text-sm mt-1">
          Instrumentos com anonimato — avaliam condições de trabalho. Pelo FAQ MTE, questionário isolado não basta:
          registre análise técnica e integre ao inventário/AEP/plano de ação.
        </p>
      </div>

      {msg && (
        <p className="text-sm rounded-lg border border-sky-200 bg-sky-50 text-sky-900 px-3 py-2">{msg}</p>
      )}

      <form onSubmit={createCampaign} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
          >
            {SURVEY_INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
          <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
            <Plus size={16} /> Criar
          </button>
        </div>
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
                    {c.analyzedAt ? ` · análise por ${c.analyzedByName}` : " · sem análise técnica"}
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

                      {reports[c.id].suggestedHazardsOverall?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {reports[c.id].suggestedHazardsOverall.map((code) => (
                            <span key={code} className="text-xs px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800">
                              {code}
                            </span>
                          ))}
                        </div>
                      )}

                      {!c.analyzedAt ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                          <p className="text-sm font-medium text-amber-950">
                            1) Análise técnica (obrigatória antes do inventário)
                          </p>
                          <input
                            value={analystName}
                            onChange={(e) => setAnalystName(e.target.value)}
                            placeholder="Responsável SST / técnico que analisou"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                          />
                          <textarea
                            value={techNotes}
                            onChange={(e) => setTechNotes(e.target.value)}
                            placeholder="Parecer técnico: o que os dados mostram, limitações do questionário, observação/entrevistas, teletrabalho, medidas iniciais…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[88px] bg-white"
                          />
                          <div className="flex flex-wrap gap-3 text-xs text-slate-700">
                            {[
                              ["SURVEY", "Pesquisa"],
                              ["OBSERVATION", "Observação"],
                              ["INTERVIEWS", "Entrevistas"],
                              ["WHISTLEBLOWER", "Denúncias"],
                              ["DOCUMENT_REVIEW", "Documentos"],
                            ].map(([id, label]) => (
                              <label key={id} className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={methods.includes(id)}
                                  onChange={() => toggleMethod(id)}
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={remoteIncluded}
                              onChange={(e) => setRemoteIncluded(e.target.checked)}
                            />
                            Trabalho remoto/híbrido considerado na análise
                          </label>
                          <button
                            type="button"
                            disabled={analyzing === c.id}
                            onClick={() => saveAnalysis(c.id)}
                            className="text-sm font-medium px-3 py-2 rounded-lg bg-amber-700 text-white disabled:opacity-50"
                          >
                            {analyzing === c.id ? "Salvando…" : "Registrar análise técnica"}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-sky-50 border border-sky-100 p-3 space-y-2">
                          <p className="text-xs text-sky-900">
                            Análise técnica registrada. 2) Importar riscos confirmados ao inventário NR-1.
                          </p>
                          <button
                            type="button"
                            disabled={importing === c.id}
                            onClick={() => importHazards(c.id)}
                            className="text-xs font-medium text-sky-700 hover:text-sky-900 underline disabled:opacity-50"
                          >
                            {importing === c.id ? "Importando…" : "Importar ao inventário de riscos"}
                          </button>
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
