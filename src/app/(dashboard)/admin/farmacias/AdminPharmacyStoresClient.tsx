"use client";

import { useEffect, useState } from "react";
import { Loader2, Pill } from "lucide-react";

type Store = {
  id: string;
  cnpj: string;
  nomeFantasia: string;
  status: string;
  addressCity: string | null;
  addressState: string | null;
  geocoded: boolean;
  inventoryCount: number;
  orderCount: number;
  createdAt: string;
};

const STATUSES = ["PENDING_REVIEW", "ACTIVE", "SUSPENDED"] as const;
const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Em revisão",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
};

export default function AdminPharmacyStoresClient() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pharmacy-stores");
    if (res.ok) {
      const data = await res.json();
      setStores(data.stores ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setSaving(id);
    await fetch(`/api/admin/pharmacy-stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Pill className="text-teal-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Farmácias Doctor8</h1>
          <p className="text-slate-500 text-sm">{stores.length} lojas cadastradas</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Farmácia</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
              <th className="px-4 py-3 font-medium">Pedidos</th>
              <th className="px-4 py-3 font-medium">Geo</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{s.nomeFantasia}</p>
                  <p className="text-xs text-slate-400">{s.cnpj}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={s.status}
                    disabled={saving === s.id}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[s.addressCity, s.addressState].filter(Boolean).join("/") || "—"}
                </td>
                <td className="px-4 py-3">{s.inventoryCount}</td>
                <td className="px-4 py-3">{s.orderCount}</td>
                <td className="px-4 py-3">{s.geocoded ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
