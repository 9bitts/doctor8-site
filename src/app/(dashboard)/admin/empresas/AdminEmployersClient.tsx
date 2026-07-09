"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";

type Company = {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  planTier: string;
  nr1ComplianceScore: number | null;
  employeeCount: number | null;
  contactEmail: string | null;
  workforceCount: number;
  riskCount: number;
  billingStatus: string;
  hasSubscription: boolean;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerEmailVerified: boolean;
  ownerLocked: boolean;
  createdAt: string;
};

const TIERS = ["PILOT", "STARTER", "GROWTH", "ENTERPRISE"];

export default function AdminEmployersClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/employers");
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function verifyOwnerEmail(userId: string | null) {
    if (!userId) return;
    if (!confirm("Confirmar verificação manual do e-mail deste usuário?")) return;
    setSaving(userId);
    await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
    setSaving(null);
    await load();
  }

  async function updateTier(id: string, planTier: string) {
    setSaving(id);
    await fetch(`/api/admin/employers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier }),
    });
    setSaving(null);
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="text-sky-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas B2B (Doctor8 Empresas)</h1>
          <p className="text-slate-500 text-sm">{companies.length} tenants cadastrados</p>
        </div>
      </div>

      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Para a empresa conseguir entrar em <strong>/empresas/login</strong>, o e-mail do responsável precisa estar verificado.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">E-mail login</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">NR-1</th>
              <th className="px-4 py-3 font-medium">Colab. EAP</th>
              <th className="px-4 py-3 font-medium">Riscos</th>
              <th className="px-4 py-3 font-medium">Billing</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{c.nomeFantasia}</p>
                  <p className="text-xs text-slate-400">{c.cnpj}</p>
                  {c.contactEmail && (
                    <p className="text-xs text-slate-500 mt-0.5">{c.contactEmail}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.ownerEmailVerified ? (
                    <span className="text-emerald-700 text-xs font-medium">Verificado</span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-700 text-xs font-medium block">Pendente</span>
                      {c.ownerUserId && (
                        <button
                          type="button"
                          disabled={saving === c.ownerUserId}
                          onClick={() => verifyOwnerEmail(c.ownerUserId)}
                          className="text-xs text-sky-700 font-semibold disabled:opacity-40"
                        >
                          Verificar e-mail
                        </button>
                      )}
                    </div>
                  )}
                  {c.ownerLocked && (
                    <p className="text-[10px] text-red-600 mt-1">Conta bloqueada</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={c.planTier}
                    disabled={saving === c.id}
                    onChange={(e) => updateTier(c.id, e.target.value)}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{c.nr1ComplianceScore ?? "—"}%</td>
                <td className="px-4 py-3">{c.workforceCount}</td>
                <td className="px-4 py-3">{c.riskCount}</td>
                <td className="px-4 py-3 text-xs">
                  {c.hasSubscription ? (
                    <span className="text-emerald-600">{c.billingStatus}</span>
                  ) : (
                    <span className="text-slate-400">Sem assinatura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <p className="p-6 text-slate-400 text-sm text-center">Nenhuma empresa cadastrada.</p>
        )}
      </div>
    </div>
  );
}
