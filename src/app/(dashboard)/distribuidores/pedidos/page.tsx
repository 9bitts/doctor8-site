"use client";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { IMPORT_STATUS_LABEL } from "@/lib/import-order";
import type { ImportOrderStatus } from "@prisma/client";

type Order = {
  id: string;
  status: ImportOrderStatus;
  quantity: number;
  productName: string;
  strengthMg: number;
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipZip: string;
  shipPhone: string | null;
  anvisaAuthorizationNumber: string | null;
  trackingNumber: string | null;
  courierName: string | null;
};

export default function DistribuidoresPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [courier, setCourier] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/distributor/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function ship(id: string) {
    setSaving(id);
    await fetch(`/api/distributor/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark_shipped",
        trackingNumber: tracking[id],
        courierName: courier[id] || "Courier",
      }),
    });
    setSaving(null);
    await load();
  }

  async function deliver(id: string) {
    setSaving(id);
    await fetch(`/api/distributor/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_delivered" }),
    });
    setSaving(null);
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Package className="text-sky-500" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fulfillment orders</h1>
          <p className="text-sm text-slate-500">Only Anvisa-cleared / paid orders appear here</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No orders ready for fulfillment yet.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {o.productName} × {o.quantity}
                  </p>
                  <p className="text-xs text-slate-500">
                    {IMPORT_STATUS_LABEL[o.status]}
                    {o.anvisaAuthorizationNumber ? ` · Anvisa ${o.anvisaAuthorizationNumber}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {o.shipName}<br />
                    {o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ""}<br />
                    {o.shipCity}/{o.shipState} {o.shipZip}<br />
                    {o.shipPhone || ""}
                  </p>
                </div>
                <div className="space-y-2">
                  {(o.status === "PAID" || o.status === "READY_TO_SHIP") && (
                    <>
                      <input
                        placeholder="Courier"
                        value={courier[o.id] || ""}
                        onChange={(e) => setCourier((p) => ({ ...p, [o.id]: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      />
                      <input
                        placeholder="Tracking / AWB"
                        value={tracking[o.id] || ""}
                        onChange={(e) => setTracking((p) => ({ ...p, [o.id]: e.target.value }))}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={saving === o.id}
                        onClick={() => ship(o.id)}
                        className="w-full rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Mark shipped
                      </button>
                    </>
                  )}
                  {o.status === "SHIPPED" && (
                    <>
                      <p className="text-xs text-sky-700">{o.courierName}: {o.trackingNumber}</p>
                      <button
                        type="button"
                        disabled={saving === o.id}
                        onClick={() => deliver(o.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Mark delivered
                      </button>
                    </>
                  )}
                  {o.status === "DELIVERED" && (
                    <p className="text-xs font-medium text-emerald-700">Delivered</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
