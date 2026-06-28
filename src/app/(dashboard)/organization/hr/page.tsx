"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Users, CheckCircle2 } from "lucide-react";

function fmt(c: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
}

export default function OrganizationHrPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; fullName: string; employmentType: string; jobTitle: string | null; salaryCents: number | null; active: boolean }[]>([]);
  const [payroll, setPayroll] = useState<{ id: string; employeeName: string; referenceMonth: string; netCents: number; status: string }[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState({ fullName: "", employmentType: "CLT", jobTitle: "", salary: "", startDate: new Date().toISOString().slice(0, 10) });
  const [payForm, setPayForm] = useState({ employeeId: "", month: new Date().toISOString().slice(0, 7), gross: "", deductions: "0" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/organization/hr");
    const data = await res.json();
    if (res.ok) {
      setEmployees(data.employees || []);
      setPayroll(data.payroll || []);
      setCanManage(data.canManage);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/hr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        employmentType: form.employmentType,
        jobTitle: form.jobTitle || undefined,
        salaryCents: form.salary ? Math.round(parseFloat(form.salary) * 100) : undefined,
        startDate: new Date(form.startDate).toISOString(),
      }),
    });
    setForm({ fullName: "", employmentType: "CLT", jobTitle: "", salary: "", startDate: new Date().toISOString().slice(0, 10) });
    await load();
  }

  async function addPayroll(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/hr", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: payForm.employeeId,
        referenceMonth: payForm.month,
        grossCents: Math.round(parseFloat(payForm.gross) * 100),
        deductionsCents: Math.round(parseFloat(payForm.deductions || "0") * 100),
      }),
    });
    await load();
  }

  async function markPaid(id: string) {
    await fetch("/api/organization/hr", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "PAID" }) });
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recursos Humanos</h1>
        <p className="text-slate-500 text-sm">Colaboradores CLT, PJ e folha de pagamento</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <>
          {canManage && (
            <form onSubmit={addEmployee} className="bg-white rounded-2xl border p-5 grid sm:grid-cols-2 gap-3">
              <input required placeholder="Nome completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className="border rounded-xl px-3 py-2 text-sm">
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="ASSOCIATE">Associado (repasse)</option>
              </select>
              <input placeholder="Cargo" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Salario base (R$)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <button type="submit" className="sm:col-span-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <Plus size={16} /> Adicionar colaborador
              </button>
            </form>
          )}

          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Users size={18} /> Colaboradores ({employees.length})</h2>
            <div className="divide-y">
              {employees.map((e) => (
                <div key={e.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{e.fullName}</p>
                    <p className="text-slate-500">{e.employmentType} {e.jobTitle ? `- ${e.jobTitle}` : ""}</p>
                  </div>
                  {e.salaryCents ? <span>{fmt(e.salaryCents)}/mês</span> : null}
                </div>
              ))}
            </div>
          </div>

          {canManage && (
            <form onSubmit={addPayroll} className="bg-white rounded-2xl border p-5 grid sm:grid-cols-4 gap-3">
              <select required value={payForm.employeeId} onChange={(e) => setPayForm({ ...payForm, employeeId: e.target.value })} className="border rounded-xl px-3 py-2 text-sm">
                <option value="">Colaborador</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
              <input type="month" value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <input required placeholder="Bruto R$" value={payForm.gross} onChange={(e) => setPayForm({ ...payForm, gross: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Descontos R$" value={payForm.deductions} onChange={(e) => setPayForm({ ...payForm, deductions: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <button type="submit" className="sm:col-span-4 bg-slate-800 text-white py-2 rounded-xl text-sm">Lancar folha</button>
            </form>
          )}

          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold mb-4">Folha de pagamento</h2>
            <div className="divide-y">
              {payroll.map((p) => (
                <div key={p.id} className="py-3 flex justify-between items-center text-sm">
                  <span>{p.employeeName} - {p.referenceMonth}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{fmt(p.netCents)}</span>
                    {p.status === "PENDING" && canManage && (
                      <button onClick={() => markPaid(p.id)} className="text-emerald-600"><CheckCircle2 size={18} /></button>
                    )}
                    {p.status === "PAID" && <span className="text-xs text-slate-400">Pago</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
