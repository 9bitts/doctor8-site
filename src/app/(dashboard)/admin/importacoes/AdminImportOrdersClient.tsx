"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Package } from "lucide-react";
import { IMPORT_STATUS_LABEL } from "@/lib/import-order";
import type { ImportOrderStatus } from "@prisma/client";

type Order = {
  id: string;
  status: ImportOrderStatus;
  quantity: number;
  productName: string;
  productUsdCents: number;
  shippingUsdCents: number;
  feePercent: number;
  feeBrlCents: number;
  shipName: string;
  shipCity: string;
  shipState: string;
  patientEmail: string;
  anvisaAuthorizationNumber: string | null;
  trackingNumber: string | null;
  documentCount: number;
  createdAt: string;
};

type SignedDoc = {
  id: string;
  kind: string;
  fileName: string | null;
  viewUrl: string;
};

const FILTERS = [
  "ALL",
  "DOCUMENTS_SUBMITTED",
  "DOCUMENTS_NEEDS_FIX",
  "ANVISA_PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "READY_TO_SHIP",
  "SHIPPED",
] as const;

export default function AdminImportOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("DOCUMENTS_SUBMITTED");
  const [authNumber, setAuthNumber] = useState<Record<string, string>>({});
  const [docsByOrder, setDocsByOrder] = useState<Record<string, SignedDoc[]>>({});
  const [loadingDocs, setLoadingDocs] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/import-orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  async function act(id: string, action: string, extra?: Record<string, string>) {
    setSaving(id);
    await fetch(`/api/admin/import-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setSaving(null);
    await load();
  }

  async function loadDocs(orderId: string) {
    if (docsByOrder[orderId]) {
      setDocsByOrder((p) => {
        const next = { ...p };
        delete next[orderId];
        return next;
      });
      return;
    }
    setLoadingDocs(orderId);
    const res = await fetch(`/api/admin/import-orders/${orderId}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocsByOrder((p) => ({ ...p, [orderId]: data.documents ?? [] }));
    }
    setLoadingDocs(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="text-sky-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Importações D2C</h1>
            <p className="text-sm text-slate-500">{filtered.length} de {orders.length} pedidos</p>
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number])}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>{f === "ALL" ? "Todos" : IMPORT_STATUS_LABEL[f as ImportOrderStatus] || f}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="py-10 text-center text-slate-400">Nenhum pedido neste filtro.</p>
        )}
        {filtered.map((o) => (
          <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{o.productName} × {o.quantity}</p>
                <p className="text-xs text-slate-500">
                  {o.shipName} · {o.shipCity}/{o.shipState} · {o.patientEmail}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  US$ {((o.productUsdCents * o.quantity + o.shippingUsdCents) / 100).toFixed(0)}
                  {" · "}taxa {o.feePercent}% ≈ R$ {(o.feeBrlCents / 100).toFixed(2)}
                </p>
                <p className="mt-1 text-xs font-medium text-sky-700">
                  {IMPORT_STATUS_LABEL[o.status]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loadingDocs === o.id}
                  onClick={() => loadDocs(o.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  {loadingDocs === o.id
                    ? "…"
                    : docsByOrder[o.id]
                      ? "Ocultar docs"
                      : `Docs (${o.documentCount ?? 0})`}
                </button>
                {o.status === "DOCUMENTS_SUBMITTED" && (
                  <>
                    <button
                      type="button"
                      disabled={saving === o.id}
                      onClick={() => act(o.id, "approve_documents")}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Aprovar docs
                    </button>
                    <button
                      type="button"
                      disabled={saving === o.id}
                      onClick={() => act(o.id, "request_document_fix")}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-40"
                    >
                      Pedir correção
                    </button>
                    <button
                      type="button"
                      disabled={saving === o.id}
                      onClick={() => act(o.id, "mark_anvisa_pending")}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      → Anvisa
                    </button>
                  </>
                )}
                {(o.status === "DOCUMENTS_APPROVED" || o.status === "ANVISA_PENDING") && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      placeholder="Nº autorização Anvisa"
                      value={authNumber[o.id] || ""}
                      onChange={(e) => setAuthNumber((p) => ({ ...p, [o.id]: e.target.value }))}
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={saving === o.id}
                      onClick={() => act(o.id, "authorize_anvisa", {
                        anvisaAuthorizationNumber: authNumber[o.id] || "",
                        anvisaInstrumentType: "SEI_EXCEPCIONALIDADE",
                      })}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Autorizar + liberar pagamento
                    </button>
                  </div>
                )}
                {o.status === "PAYMENT_PENDING" && (
                  <button
                    type="button"
                    disabled={saving === o.id}
                    onClick={() => act(o.id, "mark_paid")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    title="Escape hatch ops — preferir pagamento Stripe do paciente"
                  >
                    Marcar pago (manual)
                  </button>
                )}
                {o.status === "PAID" && (
                  <button
                    type="button"
                    disabled={saving === o.id}
                    onClick={() => act(o.id, "mark_ready_to_ship")}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Liberar para envio
                  </button>
                )}
              </div>
            </div>
            {docsByOrder[o.id] && (
              <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {docsByOrder[o.id].length === 0 && <li>Sem documentos</li>}
                {docsByOrder[o.id].map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span>{d.kind}{d.fileName ? `: ${d.fileName}` : ""}</span>
                    <a
                      href={d.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-sky-600"
                    >
                      Abrir <ExternalLink size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {o.anvisaAuthorizationNumber && (
              <p className="mt-2 text-xs text-emerald-700">Anvisa: {o.anvisaAuthorizationNumber}</p>
            )}
            {o.trackingNumber && (
              <p className="mt-1 text-xs text-slate-600">Tracking: {o.trackingNumber}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
