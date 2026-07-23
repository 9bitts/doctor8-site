"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";
import { NR1_MEASURE_TEMPLATES, getMeasureTemplate } from "@/lib/nr1-measure-templates";

type PlanItem = {
  id: string;
  measureDescription: string;
  responsibleName: string | null;
  dueDate: string | null;
  status: string;
  hazardCode: string | null;
};

type Plan = {
  id: string;
  title: string;
  version: number;
  items: PlanItem[];
};

export default function PlanoAcaoPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState("");
  const [measure, setMeasure] = useState("");
  const [responsible, setResponsible] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [hazardCode, setHazardCode] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/nr1/action-plan");
    const data = await res.json();
    setPlans(data.plans ?? []);
    if (data.plans?.[0]) setPlanId(data.plans[0].id);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createPlan() {
    await fetch("/api/employer/nr1/action-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Plano de ação PGR — ${new Date().getFullYear()}` }),
    });
    load();
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = getMeasureTemplate(id);
    if (!t) return;
    setMeasure(t.measureDescription);
    setHazardCode(t.hazardCodes[0] ?? "");
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) return;
    await fetch("/api/employer/nr1/action-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        measureDescription: measure,
        responsibleName: responsible,
        hazardCode: hazardCode || undefined,
      }),
    });
    setMeasure("");
    setResponsible("");
    setTemplateId("");
    setHazardCode("");
    load();
  }

  async function markDone(itemId: string) {
    await fetch("/api/employer/nr1/action-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, status: "DONE" }),
    });
    load();
  }

  const activePlan = plans[0];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plano de ação (PDCA)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Medidas preventivas organizacionais, responsáveis, prazos e verificação de eficácia (NR-1 subitem 1.5.5.2).
          </p>
        </div>
        <button
          type="button"
          onClick={createPlan}
          className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
        >
          Novo plano
        </button>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : activePlan ? (
        <>
          <p className="text-sm text-slate-600">
            Plano ativo: <strong>{activePlan.title}</strong> (v{activePlan.version})
          </p>
          <form onSubmit={addItem} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="font-semibold text-sm">Adicionar medida preventiva</h2>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Modelo pronto (anexos psicossocial/ergonômico)…</option>
              {NR1_MEASURE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.category}] {t.label}
                </option>
              ))}
            </select>
            <textarea
              required
              value={measure}
              onChange={(e) => setMeasure(e.target.value)}
              placeholder="Descreva a intervenção organizacional (priorize mudanças na organização do trabalho)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Responsável"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={hazardCode}
                onChange={(e) => setHazardCode(e.target.value)}
                placeholder="Código de risco (ex.: SOBRECARGA)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
              <Plus size={16} /> Adicionar
            </button>
          </form>

          <ul className="space-y-2">
            {activePlan.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-4 bg-white flex justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-800">{item.measureDescription}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.responsibleName || "Sem responsável"} · {item.status}
                  </p>
                </div>
                {item.status !== "DONE" && item.status !== "VERIFIED" && (
                  <button type="button" onClick={() => markDone(item.id)} className="text-emerald-600 shrink-0">
                    <CheckCircle2 size={20} />
                  </button>
                )}
              </li>
            ))}
            {activePlan.items.length === 0 && (
              <p className="text-slate-400 text-sm">Nenhuma medida cadastrada.</p>
            )}
          </ul>
        </>
      ) : (
        <p className="text-slate-500 text-sm">Crie um plano de ação para começar.</p>
      )}
    </div>
  );
}
