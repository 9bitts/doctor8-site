"use client";

import { useEffect, useState } from "react";
import { NR1_PSYCHOSOCIAL_HAZARDS } from "@/lib/nr1-hazards";
import { riskLevelColor, riskLevelLabel } from "@/lib/nr1-risk-matrix";
import type { EmployerRiskLevel } from "@prisma/client";
import { Loader2, Plus, Trash2 } from "lucide-react";

type RiskEntry = {
  id: string;
  hazardCode: string;
  hazardLabel: string;
  processDescription: string | null;
  exposedGroups: string | null;
  severity: number;
  probability: number;
  riskLevel: EmployerRiskLevel;
};

export default function Nr1InventoryPage() {
  const [entries, setEntries] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hazardCode, setHazardCode] = useState(NR1_PSYCHOSOCIAL_HAZARDS[0]?.code ?? "");
  const [processDescription, setProcessDescription] = useState("");
  const [exposedGroups, setExposedGroups] = useState("");
  const [severity, setSeverity] = useState(3);
  const [probability, setProbability] = useState(3);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/nr1/risks");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/employer/nr1/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazardCode,
        processDescription,
        exposedGroups,
        severity,
        probability,
      }),
    });
    setProcessDescription("");
    setExposedGroups("");
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
        <h1 className="text-2xl font-bold text-slate-900">Inventário de riscos psicossociais (PGR)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Subitem 1.5.7.3.2 da NR-1 — perigos relacionados à organização do trabalho (não diagnóstico individual).
        </p>
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Adicionar fator de risco</h2>
        <select
          value={hazardCode}
          onChange={(e) => setHazardCode(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {NR1_PSYCHOSOCIAL_HAZARDS.map((h) => (
            <option key={h.code} value={h.code}>{h.labelPt}</option>
          ))}
        </select>
        <textarea
          value={processDescription}
          onChange={(e) => setProcessDescription(e.target.value)}
          placeholder="Caracterização do processo / atividade (trabalho real)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
        />
        <input
          value={exposedGroups}
          onChange={(e) => setExposedGroups(e.target.value)}
          placeholder="Grupos expostos (setor, função)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Incluir no inventário
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando…</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Fator</th>
                <th className="px-4 py-2">Grupos</th>
                <th className="px-4 py-2">Nível</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.hazardLabel}</p>
                    {r.processDescription && (
                      <p className="text-xs text-slate-500 mt-1">{r.processDescription}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.exposedGroups || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskLevelColor(r.riskLevel)}`}>
                      {riskLevelLabel(r.riskLevel)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Nenhum risco registrado. Inicie pelo formulário acima ou pela AEP.
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
