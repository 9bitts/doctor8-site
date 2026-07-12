"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, CheckCircle2 } from "lucide-react";

type OrderItem = {
  id: string;
  drugName: string;
  presentation: string | null;
  unitPriceCents: number;
  quantity: number;
};

type Order = {
  id: string;
  status: string;
  totalCents: number;
  fulfillmentType: string;
  createdAt: string;
  paidAt: string | null;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Pronto para retirada",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function PharmacyStoreOrdersClient({ readOnly = false }: { readOnly?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy-store/orders");
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(orderId: string, status: string) {
    const res = await fetch(`/api/pharmacy-store/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-emerald-600" size={28} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 text-slate-500">
        <Package className="mx-auto mb-3 text-slate-400" size={32} />
        <p>Nenhum pedido ainda.</p>
        <p className="text-sm mt-1">Quando pacientes comprarem na rede Doctor8, os pedidos aparecem aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">
                {new Date(order.createdAt).toLocaleString("pt-BR")}
              </p>
              <p className="font-bold text-slate-900">{formatBrl(order.totalCents)}</p>
              <p className="text-sm text-emerald-700 font-medium">
                {STATUS_LABEL[order.status] || order.status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!readOnly && order.status === "PAID" && (
                <button
                  type="button"
                  onClick={() => updateStatus(order.id, "CONFIRMED")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Confirmar
                </button>
              )}
              {!readOnly && order.status === "CONFIRMED" && (
                <button
                  type="button"
                  onClick={() => updateStatus(order.id, "PREPARING")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-medium"
                >
                  Preparar
                </button>
              )}
              {!readOnly && order.status === "PREPARING" && (
                <button
                  type="button"
                  onClick={() => updateStatus(order.id, "READY")}
                  className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 font-medium"
                >
                  Marcar pronto
                </button>
              )}
              {!readOnly && order.status === "READY" && (
                <button
                  type="button"
                  onClick={() => updateStatus(order.id, "COMPLETED")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 size={12} /> Entregue
                </button>
              )}
            </div>
          </div>
          <ul className="text-sm text-slate-600 space-y-1 border-t border-slate-100 pt-3">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.drugName}
                {item.presentation ? ` · ${item.presentation}` : ""} — {formatBrl(item.unitPriceCents)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
