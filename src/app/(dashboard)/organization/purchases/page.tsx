"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Package } from "lucide-react";

function fmt(c: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
}

export default function OrganizationPurchasesPage() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; category: string | null }[]>([]);
  const [orders, setOrders] = useState<{ id: string; orderNumber: string; supplierName: string; description: string; amountCents: number; status: string }[]>([]);
  const [supForm, setSupForm] = useState({ name: "", cnpj: "", category: "" });
  const [ordForm, setOrdForm] = useState({ supplierId: "", description: "", amount: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/organization/purchases");
    const data = await res.json();
    if (res.ok) {
      setSuppliers(data.suppliers || []);
      setOrders(data.orders || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supForm),
    });
    setSupForm({ name: "", cnpj: "", category: "" });
    await load();
  }

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order",
        supplierId: ordForm.supplierId,
        description: ordForm.description,
        amountCents: Math.round(parseFloat(ordForm.amount) * 100),
      }),
    });
    setOrdForm({ supplierId: "", description: "", amount: "" });
    await load();
  }

  async function updateOrder(id: string, status: string) {
    await fetch("/api/organization/purchases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Package className="text-indigo-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
          <p className="text-slate-500 text-sm">Fornecedores e ordens de compra</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <>
          <form onSubmit={addSupplier} className="bg-white rounded-2xl border p-5 grid sm:grid-cols-3 gap-3">
            <input required placeholder="Fornecedor" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
            <input placeholder="CNPJ" value={supForm.cnpj} onChange={(e) => setSupForm({ ...supForm, cnpj: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
            <button type="submit" className="bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"><Plus size={16} /> Fornecedor</button>
          </form>

          <form onSubmit={addOrder} className="bg-white rounded-2xl border p-5 grid sm:grid-cols-3 gap-3">
            <select required value={ordForm.supplierId} onChange={(e) => setOrdForm({ ...ordForm, supplierId: e.target.value })} className="border rounded-xl px-3 py-2 text-sm">
              <option value="">Fornecedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input required placeholder="Descricao" value={ordForm.description} onChange={(e) => setOrdForm({ ...ordForm, description: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
            <input required placeholder="Valor R$" value={ordForm.amount} onChange={(e) => setOrdForm({ ...ordForm, amount: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
            <button type="submit" className="sm:col-span-3 bg-slate-800 text-white py-2 rounded-xl text-sm">Criar ordem de compra</button>
          </form>

          <div className="bg-white rounded-2xl border divide-y">
            {orders.map((o) => (
              <div key={o.id} className="px-5 py-4 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">{o.orderNumber} - {o.supplierName}</p>
                  <p className="text-slate-500">{o.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmt(o.amountCents)}</p>
                  <div className="flex gap-2 mt-1 justify-end">
                    {o.status === "DRAFT" && <button onClick={() => updateOrder(o.id, "SENT")} className="text-xs text-indigo-600">Enviar</button>}
                    {o.status === "SENT" && <button onClick={() => updateOrder(o.id, "RECEIVED")} className="text-xs text-emerald-600">Recebido</button>}
                    <span className="text-xs text-slate-400">{o.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
