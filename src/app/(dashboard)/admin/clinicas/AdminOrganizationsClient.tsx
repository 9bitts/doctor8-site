"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";

type Organization = {
  id: string;
  cnpj: string;
  nomeFantasia: string;
  contactEmail: string | null;
  addressCity: string | null;
  addressState: string | null;
  memberCount: number;
  professionalCount: number;
  employeeCount: number;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerEmailVerified: boolean;
  ownerLocked: boolean;
};

export default function AdminOrganizationsClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/organizations");
    if (res.ok) {
      const data = await res.json();
      setOrganizations(data.organizations ?? []);
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
        <Building2 className="text-indigo-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clínicas Doctor8</h1>
          <p className="text-slate-500 text-sm">{organizations.length} organizações cadastradas</p>
        </div>
      </div>

      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Para a clínica conseguir entrar, o <strong>e-mail do responsável</strong> precisa estar verificado.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Clínica</th>
              <th className="px-4 py-3 font-medium">E-mail login</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Profissionais</th>
              <th className="px-4 py-3 font-medium">Equipe</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{org.nomeFantasia}</p>
                  <p className="text-xs text-slate-400">{org.cnpj}</p>
                  {org.contactEmail && (
                    <p className="text-xs text-slate-500 mt-0.5">{org.contactEmail}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {org.ownerEmailVerified ? (
                    <span className="text-emerald-700 text-xs font-medium">Verificado</span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-700 text-xs font-medium block">Pendente</span>
                      {org.ownerUserId && (
                        <button
                          type="button"
                          disabled={saving === org.ownerUserId}
                          onClick={() => verifyOwnerEmail(org.ownerUserId)}
                          className="text-xs text-indigo-700 font-semibold disabled:opacity-40"
                        >
                          Verificar e-mail
                        </button>
                      )}
                    </div>
                  )}
                  {org.ownerLocked && (
                    <p className="text-[10px] text-red-600 mt-1">Conta bloqueada</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[org.addressCity, org.addressState].filter(Boolean).join("/") || "—"}
                </td>
                <td className="px-4 py-3">{org.professionalCount}</td>
                <td className="px-4 py-3">{org.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 && (
          <p className="p-6 text-slate-400 text-sm text-center">Nenhuma clínica cadastrada.</p>
        )}
      </div>
    </div>
  );
}
