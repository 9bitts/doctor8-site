"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pill } from "lucide-react";

type Store = {
  id: string;
  cnpj: string;
  nomeFantasia: string;
  status: string;
  platformFeeCents: number;
  addressCity: string | null;
  addressState: string | null;
  geocoded: boolean;
  inventoryCount: number;
  orderCount: number;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerEmailVerified: boolean;
  ownerLocked: boolean;
  createdAt: string;
};

const STATUSES = ["ALL", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ALL: "Todas",
  PENDING_REVIEW: "Em revisão",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
};

function formatFee(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPharmacyStoresClient() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});

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

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return stores;
    return stores.filter((s) => s.status === statusFilter);
  }, [stores, statusFilter]);

  async function verifyOwnerEmail(userId: string | null) {
    if (!userId) return;
    if (!confirm("Confirmar verificação manual do e-mail deste usuário?")) return;
    setSaving(userId);
    await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
    setSaving(null);
    await load();
  }

  async function patchStore(id: string, body: Record<string, unknown>) {
    setSaving(id);
    await fetch(`/api/admin/pharmacy-stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    await load();
  }

  async function saveFee(id: string) {
    const raw = feeDraft[id];
    if (raw == null) return;
    const reais = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(reais) || reais < 0) return;
    await patchStore(id, { platformFeeCents: Math.round(reais * 100) });
    setFeeDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Pill className="text-teal-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Farmácias Doctor8</h1>
            <p className="text-slate-500 text-sm">{filtered.length} de {stores.length} lojas</p>
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUSES)[number])}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {STATUSES.map((st) => (
            <option key={st} value={st}>{STATUS_LABEL[st]}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Para a farmácia conseguir entrar, o <strong>e-mail do usuário</strong> precisa estar verificado.
        Ativar a loja verifica o e-mail do responsável automaticamente.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Farmácia</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">E-mail login</th>
              <th className="px-4 py-3 font-medium">Taxa Doctor8</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
              <th className="px-4 py-3 font-medium">Pedidos</th>
              <th className="px-4 py-3 font-medium">Geo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{s.nomeFantasia}</p>
                  <p className="text-xs text-slate-400">{s.cnpj}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={s.status}
                    disabled={saving === s.id}
                    onChange={(e) => patchStore(s.id, { status: e.target.value })}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {STATUSES.filter((st) => st !== "ALL").map((st) => (
                      <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {s.ownerEmailVerified ? (
                    <span className="text-emerald-700 text-xs font-medium">Verificado</span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-700 text-xs font-medium block">Pendente</span>
                      {s.ownerUserId && (
                        <button
                          type="button"
                          disabled={saving === s.ownerUserId}
                          onClick={() => verifyOwnerEmail(s.ownerUserId)}
                          className="text-xs text-teal-700 font-semibold disabled:opacity-40"
                        >
                          Verificar e-mail
                        </button>
                      )}
                    </div>
                  )}
                  {s.ownerLocked && (
                    <p className="text-[10px] text-red-600 mt-1">Conta bloqueada</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={(s.platformFeeCents / 100).toFixed(2).replace(".", ",")}
                      onChange={(e) => setFeeDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={saving === s.id || feeDraft[s.id] == null}
                      onClick={() => saveFee(s.id)}
                      className="text-xs text-teal-700 font-semibold disabled:opacity-40"
                    >
                      OK
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatFee(s.platformFeeCents)} atual</p>
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
