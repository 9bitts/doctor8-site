"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RISK_CATEGORY_LABELS,
  type EmployerRiskCategoryCode,
  type EmployerRiskCatalogItem,
} from "@/lib/employer-risk-catalog";
import { riskLevelColor, riskLevelLabel } from "@/lib/nr1-risk-matrix";
import type { EmployerRiskLevel } from "@prisma/client";
import { Loader2, Plus, Trash2 } from "lucide-react";

type RiskEntry = {
  id: string;
  hazardCode: string;
  hazardLabel: string;
  riskCategory: EmployerRiskCategoryCode;
  agent: string | null;
  processDescription: string | null;
  exposedGroups: string | null;
  exposureType: string | null;
  exposureLevel: string | null;
  toleranceLimit: string | null;
  severity: number;
  probability: number;
  riskLevel: EmployerRiskLevel;
  gheGroupId: string | null;
  gheGroup?: { id: string; name: string; sector: string | null } | null;
};

type GheOpt = { id: string; name: string; sector: string | null };

export default function Nr1InventoryPage() {
  const [entries, setEntries] = useState<RiskEntry[]>([]);
  const [catalog, setCatalog] = useState<EmployerRiskCatalogItem[]>([]);
  const [gheGroups, setGheGroups] = useState<GheOpt[]>([]);
  const [exposureTypes, setExposureTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState<EmployerRiskCategoryCode>("FISICO");
  const [hazardCode, setHazardCode] = useState("");
  const [agent, setAgent] = useState("");
  const [gheGroupId, setGheGroupId] = useState("");
  const [exposureType, setExposureType] = useState("Habitual e intermitente");
  const [exposureLevel, setExposureLevel] = useState("");
  const [toleranceLimit, setToleranceLimit] = useState("");
  const [processDescription, setProcessDescription] = useState("");
  const [severity, setSeverity] = useState(3);
  const [probability, setProbability] = useState(3);

  const filteredCatalog = useMemo(
    () => catalog.filter((c) => c.category === category),
    [catalog, category],
  );

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/nr1/risks");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setCatalog(data.catalog ?? []);
    setGheGroups(data.gheGroups ?? []);
    setExposureTypes(data.exposureTypes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const first = filteredCatalog[0];
    if (first) {
      setHazardCode(first.code);
      setAgent(first.agent);
      setToleranceLimit(first.defaultToleranceLimit ?? "");
    }
  }, [category, filteredCatalog]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/employer/nr1/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazardCode,
        riskCategory: category,
        agent,
        gheGroupId: gheGroupId || null,
        exposureType,
        exposureLevel,
        toleranceLimit,
        processDescription,
        severity,
        probability,
      }),
    });
    setProcessDescription("");
    setExposureLevel("");
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este risco do inventário?")) return;
    await fetch(`/api/employer/nr1/risks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventário de riscos (PGR)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Passo 2 — Segurança do Trabalho. Riscos físicos, químicos, biológicos, de acidentes, ergonômicos e psicossociais por GHE.
        </p>
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Adicionar risco</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EmployerRiskCategoryCode)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {(Object.keys(RISK_CATEGORY_LABELS) as EmployerRiskCategoryCode[]).map((k) => (
                <option key={k} value={k}>{RISK_CATEGORY_LABELS[k]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Agente / perigo
            <select
              value={hazardCode}
              onChange={(e) => {
                const code = e.target.value;
                setHazardCode(code);
                const item = catalog.find((c) => c.code === code);
                if (item) {
                  setAgent(item.agent);
                  setToleranceLimit(item.defaultToleranceLimit ?? "");
                }
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {filteredCatalog.map((h) => (
                <option key={h.code} value={h.code}>{h.labelPt}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 sm:col-span-2">
            GHE (função / setor)
            <select
              value={gheGroupId}
              onChange={(e) => setGheGroupId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecionar GHE…</option>
              {gheGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.sector ? ` · ${g.sector}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Exposição
            <select
              value={exposureType}
              onChange={(e) => setExposureType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {(exposureTypes.length ? exposureTypes : ["Habitual e intermitente", "Habitual e permanente"]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Nível de exposição
            <input
              value={exposureLevel}
              onChange={(e) => setExposureLevel(e.target.value)}
              placeholder="Ex.: 80,68 dB(A) ou Baixo / Médio / Alto"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Limite de tolerância
            <input
              value={toleranceLimit}
              onChange={(e) => setToleranceLimit(e.target.value)}
              placeholder="Ex.: 85 dB(A)"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Agente (texto)
            <input
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <textarea
          value={processDescription}
          onChange={(e) => setProcessDescription(e.target.value)}
          placeholder="Caracterização do processo / atividade (trabalho real)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
        />
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-slate-600">
            Severidade (1–5)
            <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full" />
            <span className="font-medium text-slate-900">{severity}</span>
          </label>
          <label className="text-sm text-slate-600">
            Probabilidade (1–5)
            <input type="range" min={1} max={5} value={probability} onChange={(e) => setProbability(+e.target.value)} className="w-full" />
            <span className="font-medium text-slate-900">{probability}</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !hazardCode}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Incluir no inventário
        </button>
      </form>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Categoria</th>
                <th className="text-left px-3 py-2">Agente</th>
                <th className="text-left px-3 py-2">GHE</th>
                <th className="text-left px-3 py-2">Exposição</th>
                <th className="text-left px-3 py-2">Nível</th>
                <th className="text-left px-3 py-2">LT</th>
                <th className="text-left px-3 py-2">Risco</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{RISK_CATEGORY_LABELS[e.riskCategory] ?? e.riskCategory}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{e.agent || e.hazardLabel}</td>
                  <td className="px-3 py-2 text-slate-500">{e.gheGroup?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{e.exposureType ?? "—"}</td>
                  <td className="px-3 py-2">{e.exposureLevel ?? "—"}</td>
                  <td className="px-3 py-2">{e.toleranceLimit ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskLevelColor(e.riskLevel)}`}>
                      {riskLevelLabel(e.riskLevel)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => handleDelete(e.id)} className="text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    Nenhum risco cadastrado. Cadastre GHE em Estrutura e inclua os agentes do PGR.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
