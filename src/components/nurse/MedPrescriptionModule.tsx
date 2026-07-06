"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { FileDown, Loader2, Plus, Trash2 } from "lucide-react";
import { NURSING_MED_CATALOG, NURSING_MED_CATEGORIES, NURSING_MED_ROUTES } from "@/lib/nursing/med-catalog";
import type { NursingMedItem } from "@/lib/nursing/med-prescription-types";
import type { NurseChart } from "./NurseChartWorkspace";

type Rx = {
  id: string;
  medications: NursingMedItem[];
  instructions: string | null;
  validUntil: string | null;
  cofenCategory: string | null;
  status: string;
  createdAt: string;
};

const emptyItem = (): NursingMedItem => ({
  name: "",
  dosage: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export default function MedPrescriptionModule({ chart }: { chart: NurseChart }) {
  const { t } = useI18n();
  const [list, setList] = useState<Rx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("vaccine");
  const [items, setItems] = useState<NursingMedItem[]>([emptyItem()]);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nurse/charts/${chart.id}/med-prescriptions`);
      const data = await res.json();
      setList(data.prescriptions || []);
    } catch {
      setList([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function addFromCatalog(catalogId: string) {
    const entry = NURSING_MED_CATALOG.find((c) => c.id === catalogId);
    if (!entry) return;
    setItems((prev) => [
      ...prev,
      {
        name: t(entry.labelKey),
        dosage: entry.defaultDosageHintKey ? t(entry.defaultDosageHintKey) : "",
        route: t(entry.defaultRouteKey),
        frequency: "",
        catalogId,
      },
    ]);
  }

  function updateItem(idx: number, patch: Partial<NursingMedItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function issue() {
    const meds = items.filter((m) => m.name.trim() && m.dosage.trim() && m.route.trim() && m.frequency.trim());
    if (meds.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/nurse/charts/${chart.id}/med-prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: meds,
          instructions: instructions || undefined,
          validDays,
          cofenCategory: category,
          status: "ACTIVE",
        }),
      });
      setItems([emptyItem()]);
      setInstructions("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-rose-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
        <p className="font-semibold">{t("nurse.medRx.cofenNotice")}</p>
        <p className="mt-1 text-amber-800/90">{t("nurse.medRx.cofenDesc")}</p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("nurse.medRx.new")}</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("nurse.medRx.category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {NURSING_MED_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{t(c.labelKey)}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t("nurse.medRx.catalog")}</p>
          <div className="flex flex-wrap gap-2">
            {NURSING_MED_CATALOG.filter((c) => c.categoryKey === category || category === "other").map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addFromCatalog(c.id)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
              >
                <Plus size={12} className="inline mr-1" />
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">{t("nurse.medRx.item")} {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              value={item.name}
              onChange={(e) => updateItem(idx, { name: e.target.value })}
              placeholder={t("nurse.medRx.name")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={item.dosage}
                onChange={(e) => updateItem(idx, { dosage: e.target.value })}
                placeholder={t("nurse.medRx.dosage")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={item.route}
                onChange={(e) => updateItem(idx, { route: e.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">{t("nurse.medRx.route")}</option>
                {NURSING_MED_ROUTES.map((r) => (
                  <option key={r.id} value={t(r.labelKey)}>{t(r.labelKey)}</option>
                ))}
              </select>
              <input
                value={item.frequency}
                onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                placeholder={t("nurse.medRx.frequency")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={item.duration || ""}
                onChange={(e) => updateItem(idx, { duration: e.target.value })}
                placeholder={t("nurse.medRx.duration")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="text-sm font-medium text-rose-700 hover:text-rose-800"
        >
          + {t("nurse.medRx.addItem")}
        </button>

        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder={t("nurse.medRx.instructions")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">{t("nurse.medRx.validDays")}</label>
          <input
            type="number"
            min={1}
            max={365}
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={issue}
          disabled={saving}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
        >
          {saving ? t("nurse.saving") : t("nurse.medRx.issue")}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("nurse.medRx.history")}</h3>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">{t("nurse.medRx.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {list.map((rx) => (
              <li key={rx.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {new Date(rx.createdAt).toLocaleString()} · {rx.status}
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-700">
                      {(rx.medications as NursingMedItem[]).map((m, i) => (
                        <li key={i}>
                          {m.name} — {m.dosage}, {m.route}, {m.frequency}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={`/api/nurse/med-prescriptions/${rx.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                  >
                    <FileDown size={14} />
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
