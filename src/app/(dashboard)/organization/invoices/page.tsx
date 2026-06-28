"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Receipt } from "lucide-react";

function fmt(c: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
}

export default function OrganizationInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<{ id: string; number: string | null; recipientName: string; description: string; amountCents: number; status: string }[]>([]);
  const [form, setForm] = useState({ recipientName: "", recipientDoc: "", description: "", amount: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/organization/invoices");
    const data = await res.json();
    if (res.ok) setInvoices(data.invoices || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName: form.recipientName,
        recipientDoc: form.recipientDoc || undefined,
        description: form.description,
        amountCents: Math.round(parseFloat(form.amount) * 100),
      }),
    });
    setForm({ recipientName: "", recipientDoc: "", description: "", amount: "" });
    await load();
  }

  async function issue(id: string) {
    const num = `NF${Date.now().toString().slice(-8)}`;
    await fetch("/api/organization/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "ISSUED", number: num }),
    });
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="text-indigo-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notas fiscais (NFS-e)</h1>
          <p className="text-slate-500 text-sm">Emissão manual — integração Focus NFe na próxima versão</p>
        </div>
      </div>

      <form onSubmit={create} className="bg-white rounded-2xl border p-5 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input required placeholder="Tomador" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
          <input placeholder="CPF/CNPJ tomador" value={form.recipientDoc} onChange={(e) => setForm({ ...form, recipientDoc: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
          <input required placeholder="Descricao do servico" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sm:col-span-2 border rounded-xl px-3 py-2 text-sm" />
          <input required placeholder="Valor R$" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1">
          <Plus size={16} /> Criar rascunho
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <div className="bg-white rounded-2xl border divide-y">
          {invoices.map((i) => (
            <div key={i.id} className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm">{i.recipientName}</p>
                <p className="text-xs text-slate-500">{i.description}</p>
                {i.number && <p className="text-xs text-indigo-600 mt-0.5">N. {i.number}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{fmt(i.amountCents)}</p>
                {i.status === "DRAFT" ? (
                  <button onClick={() => issue(i.id)} className="text-xs text-indigo-600 hover:underline mt-1">Emitir</button>
                ) : (
                  <span className="text-xs text-emerald-600">{i.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
