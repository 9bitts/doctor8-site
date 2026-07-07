"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DENTAL_PROCEDURES } from "@/lib/dentistry/procedures";
import type { DentistChart } from "./DentistChartWorkspace";

type PlanItem = {
  procedureCode: string;
  description: string;
  toothNumbers: number[];
  unitPriceCents: number;
  quantity: number;
};

type Plan = {
  id: string;
  title: string;
  status: string;
  totalAmountCents: number;
  discountCents: number;
  patientApproved: boolean;
  items: PlanItem[];
};

export default function TreatmentPlanModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [discountCents, setDiscountCents] = useState(0);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/dentist/charts/${chart.id}/treatment-plans`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans || []))
      .catch(() => {});
  }

  useEffect(() => { load(); }, [chart.id]);

  function addItem() {
    const proc = DENTAL_PROCEDURES[0];
    setItems([
      ...items,
      {
        procedureCode: proc.code,
        description: t(proc.nameKey),
        toothNumbers: [],
        unitPriceCents: proc.defaultPriceCents,
        quantity: 1,
      },
    ]);
  }

  async function createPlan() {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dentist/charts/${chart.id}/treatment-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, discountCents }),
      });
      if (res.ok) {
        setItems([]);
        setDiscountCents(0);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function approvePlan(planId: string) {
    await fetch(`/api/dentist/charts/${chart.id}/treatment-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientApproved: true, status: "APPROVED" }),
    });
    load();
  }

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      {plans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">{t("dental.plan.existing")}</h3>
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{plan.title}</p>
                  <p className="text-sm text-slate-500">
                    {t(`dental.plan.status.${plan.status.toLowerCase()}`)} · {formatBRL(plan.totalAmountCents)}
                  </p>
                </div>
                {!plan.patientApproved && plan.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => approvePlan(plan.id)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                  >
                    <CheckCircle size={14} />
                    {t("dental.plan.approve")}
                  </button>
                )}
              </div>
              <ul className="mt-2 text-xs text-slate-600 space-y-1">
                {plan.items.map((item, i) => (
                  <li key={i}>{item.description} — {formatBRL(item.unitPriceCents * item.quantity)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{t("dental.plan.new")}</h3>
          <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
            <Plus size={14} />
            {t("dental.plan.addItem")}
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-2 border-b border-slate-100 pb-3">
            <select
              value={item.procedureCode}
              onChange={(e) => {
                const proc = DENTAL_PROCEDURES.find((p) => p.code === e.target.value);
                const next = [...items];
                next[idx] = {
                  ...item,
                  procedureCode: e.target.value,
                  description: proc ? t(proc.nameKey) : item.description,
                  unitPriceCents: proc?.defaultPriceCents ?? item.unitPriceCents,
                };
                setItems(next);
              }}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {DENTAL_PROCEDURES.map((p) => (
                <option key={p.code} value={p.code}>{t(p.nameKey)}</option>
              ))}
            </select>
            <input
              type="number"
              value={item.unitPriceCents / 100}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...item, unitPriceCents: Math.round(Number(e.target.value) * 100) };
                setItems(next);
              }}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="R$"
            />
          </div>
        ))}

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">{t("dental.plan.discount")}</label>
          <input
            type="number"
            value={discountCents / 100}
            onChange={(e) => setDiscountCents(Math.round(Number(e.target.value) * 100))}
            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={createPlan}
          disabled={saving || items.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t("dental.plan.save")}
        </button>
      </div>
    </div>
  );
}
