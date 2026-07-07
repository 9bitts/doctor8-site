"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { FileDown, Loader2, Plus, Trash2 } from "lucide-react";
import type { MedicationItem } from "@/lib/pharmacy/types";
import type { PharmacistChart } from "./PharmacistChartWorkspace";

type Rx = {
  id: string;
  medications: MedicationItem[];
  instructions: string | null;
  validUntil: string | null;
  status: string;
  createdAt: string;
};

const emptyItem = (): MedicationItem => ({
  name: "",
  dosage: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
});

export default function PharmaPrescriptionModule({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [list, setList] = useState<Rx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MedicationItem[]>([emptyItem()]);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacist/charts/${chart.id}/prescriptions`);
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

  function updateItem(idx: number, patch: Partial<MedicationItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function issue() {
    const meds = items.filter((m) => m.name.trim() && m.dosage?.trim() && m.frequency?.trim());
    if (meds.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/pharmacist/charts/${chart.id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: meds,
          instructions: instructions || undefined,
          validUntil: new Date(Date.now() + validDays * 86400000).toISOString(),
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
        <Loader2 className="animate-spin text-teal-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 text-sm text-teal-900">
        <p className="font-semibold">{t("pharma.rx.cffNotice")}</p>
        <p className="mt-1 text-teal-800/90">{t("pharma.rx.cffDesc")}</p>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">{t("pharma.rx.new")}</h3>

        {items.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">{t("pharma.rx.item")} {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              value={item.name}
              onChange={(e) => updateItem(idx, { name: e.target.value })}
              placeholder={t("pharma.rx.name")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={item.dosage || ""}
                onChange={(e) => updateItem(idx, { dosage: e.target.value })}
                placeholder={t("pharma.rx.dosage")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={item.route || ""}
                onChange={(e) => updateItem(idx, { route: e.target.value })}
                placeholder={t("pharma.rx.route")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={item.frequency || ""}
                onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                placeholder={t("pharma.rx.frequency")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={item.duration || ""}
                onChange={(e) => updateItem(idx, { duration: e.target.value })}
                placeholder={t("pharma.rx.duration")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setItems((p) => [...p, emptyItem()])}
          className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
        >
          <Plus size={14} /> {t("pharma.rx.addItem")}
        </button>

        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder={t("pharma.rx.instructions")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">{t("pharma.rx.validDays")}</label>
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
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        >
          {saving ? t("pharma.saving") : t("pharma.rx.issue")}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("pharma.rx.history")}</h3>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">{t("pharma.rx.noHistory")}</p>
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
                      {(rx.medications as MedicationItem[]).map((m, i) => (
                        <li key={i}>
                          {m.name} — {m.dosage}, {m.frequency}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={`/api/pharmacist/prescriptions/${rx.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
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
