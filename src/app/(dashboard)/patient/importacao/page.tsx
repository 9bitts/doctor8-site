"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Loader2, Plus, ArrowRight } from "lucide-react";
import { IMPORT_STATUS_LABEL } from "@/lib/import-order";
import type { ImportOrderStatus } from "@prisma/client";

type Order = {
  id: string;
  status: ImportOrderStatus;
  quantity: number;
  product: { name: string };
  createdAt: string;
  trackingNumber: string | null;
};

export default function PatientImportacaoListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/patient/import/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sky-600">
            <Package size={22} />
            <span className="text-sm font-semibold uppercase tracking-wide">Importação Zephra</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Meus pedidos de importação</h1>
          <p className="mt-1 text-sm text-slate-500">
            Uso pessoal com autorização Anvisa — envio dos EUA para sua casa.
          </p>
        </div>
        <Link
          href="/patient/importacao/nova"
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
        >
          <Plus size={16} /> Novo pedido
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-500">Nenhum pedido ainda.</p>
          <Link href="/patient/importacao/nova" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-600">
            Solicitar importação <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/patient/importacao/${o.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{o.product.name}</p>
                  <p className="text-xs text-slate-400">
                    Qtd {o.quantity} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  {o.trackingNumber && (
                    <p className="mt-1 text-xs text-sky-700">Tracking: {o.trackingNumber}</p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {IMPORT_STATUS_LABEL[o.status] || o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
