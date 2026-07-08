"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
} from "lucide-react";

type OrderItem = {
  drugName: string;
  presentation: string | null;
  unitPriceCents: number;
};

type Order = {
  id: string;
  status: string;
  fulfillmentType: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  paidAt: string | null;
  createdAt: string;
  pharmacyStore: { nomeFantasia: string; slug: string };
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparação",
  READY: "Pronto para retirada",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PatientPharmacyOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patient/pharmacy/orders")
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus pedidos de farmácia</h1>
          <p className="text-sm text-slate-500 mt-1">Compras na rede Doctor8 Farmácias</p>
        </div>
        <Link
          href="/patient/prescriptions"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          Comprar com receita →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <Package className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-600 font-medium">Nenhum pedido ainda</p>
          <p className="text-sm text-slate-500 mt-2">
            Busque farmácias parceiras a partir de uma receita assinada.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{o.pharmacyStore.nomeFantasia}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">{formatBrl(o.totalCents)}</p>
                  <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </div>
              <ul className="mt-3 text-sm text-slate-600 space-y-1">
                {o.items.map((item, i) => (
                  <li key={i}>
                    {item.drugName}
                    {item.presentation ? ` — ${item.presentation}` : ""}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <MapPin size={11} />
                {o.fulfillmentType === "DELIVERY" ? "Entrega em domicílio" : "Retirada na loja"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
