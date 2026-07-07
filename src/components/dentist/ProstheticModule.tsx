"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DentistChart } from "./DentistChartWorkspace";

type Order = {
  id: string;
  labName: string;
  description: string;
  status: string;
  orderedAt: string;
  expectedAt: string | null;
};

const STATUS_FLOW = ["ORDERED", "IN_LAB", "READY", "DELIVERED"] as const;

export default function ProstheticModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [labName, setLabName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/dentist/charts/${chart.id}/prosthetics`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {});
  }

  useEffect(() => { load(); }, [chart.id]);

  async function create() {
    if (!labName.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dentist/charts/${chart.id}/prosthetics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labName, description }),
      });
      if (res.ok) {
        setLabName("");
        setDescription("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus(orderId: string, status: string) {
    await fetch(`/api/dentist/charts/${chart.id}/prosthetics`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">{order.description}</p>
              <p className="text-sm text-slate-500">{order.labName}</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-sky-50 text-sky-700">
              {t(`dental.prosthetic.status.${order.status.toLowerCase()}`)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => advanceStatus(order.id, s)}
                className={`text-xs px-2 py-1 rounded border ${
                  order.status === s ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 text-slate-600"
                }`}
              >
                {t(`dental.prosthetic.status.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">{t("dental.prosthetic.new")}</h3>
        <input
          value={labName}
          onChange={(e) => setLabName(e.target.value)}
          placeholder={t("dental.prosthetic.labName")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("dental.prosthetic.description")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t("dental.prosthetic.create")}
        </button>
      </div>
    </div>
  );
}
