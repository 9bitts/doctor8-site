"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, QrCode, ArrowRight } from "lucide-react";

type QueueItem = {
  token: string;
  patientName: string;
  validateUrl: string;
  order: {
    id: string;
    status: string;
    fulfillmentType: string;
    totalCents: number;
    pharmacyStore: { nomeFantasia: string; addressCity: string | null };
  } | null;
};

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function PharmacistNetworkQueueClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pharmacist/pharmacy-network/queue")
      .then((r) => (r.ok ? r.json() : { queue: [] }))
      .then((data) => setQueue(data.queue ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 p-6 text-center">
        Nenhuma receita pendente de validação na rede no momento.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {queue.map((item) => (
        <li
          key={item.token}
          className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <p className="font-semibold text-slate-900">{item.patientName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {item.order?.pharmacyStore.nomeFantasia}
              {item.order?.pharmacyStore.addressCity ? ` · ${item.order.pharmacyStore.addressCity}` : ""}
            </p>
            {item.order && (
              <p className="text-xs text-emerald-700 font-medium mt-1">
                {formatBrl(item.order.totalCents)} ·{" "}
                {item.order.fulfillmentType === "DELIVERY" ? "Entrega" : "Retirada"}
              </p>
            )}
          </div>
          <Link
            href={item.validateUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-500"
          >
            <QrCode size={16} />
            Validar
            <ArrowRight size={14} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
