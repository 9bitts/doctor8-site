"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, CheckCircle2, AlertTriangle } from "lucide-react";

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(cents / 100);
}

type Entry = {
  id: string;
  type: string;
  status: string;
  description: string;
  category: string | null;
  amountCents: number;
  dueDate: string | null;
  isOverdue: boolean;
};

export default function OrganizationLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState({
    incomePending: 0, incomePaid: 0, expensePending: 0, expensePaid: 0, overdueCount: 0,
  });
  const [currency, setCurrency] = useState("BRL");
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    description: "",
    category: "",
    amount: "",
    dueDate: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/organization/ledger");
    const data = await res.json();
    if (res.ok) {
      setEntries(data.entries || []);
      setSummary(data.summary || {});
      setCurrency(data.currency);
      setCanManage(data.canManage);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    if (!amountCents || !form.description.trim()) return;
    setSaving(true);
    await fetch("/api/organization/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        description: form.description.trim(),
        category: form.category || undefined,
        amountCents,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      }),
    });
    setForm({ type: "EXPENSE", description: "", category: "", amount: "", dueDate: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function markPaid(id: string) {
    await fetch("/api/organization/ledger", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PAID" }),
    });
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contas a pagar e receber</h1>
          <p className="text-slate-500 text-sm mt-1">Fluxo financeiro da cl?nica</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-500">
            <Plus size={16} /> Novo lan?amento
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "A receber", value: fmt(summary.incomePending, currency), color: "text-emerald-600" },
          { label: "Recebido", value: fmt(summary.incomePaid, currency), color: "text-emerald-700" },
          { label: "A pagar", value: fmt(summary.expensePending, currency), color: "text-red-600" },
          { label: "Pago", value: fmt(summary.expensePaid, currency), color: "text-slate-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {summary.overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
          <AlertTriangle size={16} />
          {summary.overdueCount} lan?amento(s) vencido(s)
        </div>
      )}

      {showForm && (
        <form onSubmit={createEntry} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "INCOME" | "EXPENSE" })}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
            <input placeholder="Categoria (opcional)" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <input required placeholder="Descri??o" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <div className="flex gap-3">
            <input required placeholder="Valor (R$)" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            <input type="date" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando?" : "Salvar lan?amento"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {entries.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-12">Nenhum lan?amento ainda.</p>
          ) : entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="font-medium text-slate-900">{e.description}</p>
                <p className="text-xs text-slate-500">
                  {e.type === "INCOME" ? "Receita" : "Despesa"}
                  {e.category ? ` ? ${e.category}` : ""}
                  {e.dueDate ? ` ? Venc. ${new Date(e.dueDate).toLocaleDateString("pt-BR")}` : ""}
                  {e.isOverdue && <span className="text-amber-600 ml-1">? Vencido</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold ${e.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                  {e.type === "EXPENSE" ? "?" : "+"}{fmt(e.amountCents, currency)}
                </span>
                {e.status === "PENDING" && canManage && (
                  <button onClick={() => markPaid(e.id)} title="Marcar como pago"
                    className="text-emerald-600 hover:text-emerald-700">
                    <CheckCircle2 size={18} />
                  </button>
                )}
                {e.status === "PAID" && <span className="text-xs text-slate-400">Pago</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
