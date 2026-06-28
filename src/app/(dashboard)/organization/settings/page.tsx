"use client";

import { useState, useEffect } from "react";
import { Loader2, Building2 } from "lucide-react";

export default function OrganizationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<{
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    contactPhone: string;
    whatsappRemindersEnabled: boolean;
    address: { city?: string; state?: string; street?: string };
    memberRole: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/organization");
      const data = await res.json();
      if (res.ok && data.organization) {
        setOrg({
          nomeFantasia: data.organization.nomeFantasia,
          razaoSocial: data.organization.razaoSocial,
          cnpj: data.organization.cnpj,
          contactPhone: data.organization.contactPhone || "",
          whatsappRemindersEnabled: data.organization.whatsappRemindersEnabled ?? true,
          address: data.organization.address || {},
          memberRole: data.organization.memberRole,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    try {
      await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeFantasia: org.nomeFantasia,
          contactPhone: org.contactPhone,
          addressCity: org.address.city,
          addressState: org.address.state,
          addressStreet: org.address.street,
          whatsappRemindersEnabled: org.whatsappRemindersEnabled,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!org) {
    return <p className="text-slate-500">Organização não encontrada.</p>;
  }

  const canEdit = org.memberRole === "OWNER" || org.memberRole === "ADMIN";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Building2 className="text-indigo-600" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 text-sm">Dados da organização (CNPJ)</p>
        </div>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
          <input disabled value={org.cnpj} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Razão social</label>
          <input disabled value={org.razaoSocial} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome fantasia</label>
          <input
            disabled={!canEdit}
            value={org.nomeFantasia}
            onChange={(e) => setOrg({ ...org, nomeFantasia: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
          <input
            disabled={!canEdit}
            value={org.contactPhone}
            onChange={(e) => setOrg({ ...org, contactPhone: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-slate-50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
            <input
              disabled={!canEdit}
              value={org.address.city || ""}
              onChange={(e) => setOrg({ ...org, address: { ...org.address, city: e.target.value } })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
            <input
              disabled={!canEdit}
              maxLength={2}
              value={org.address.state || ""}
              onChange={(e) => setOrg({ ...org, address: { ...org.address, state: e.target.value.toUpperCase() } })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>
        {canEdit && (
          <label className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={org.whatsappRemindersEnabled}
              onChange={(e) => setOrg({ ...org, whatsappRemindersEnabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-slate-700">Lembretes e confirmações via WhatsApp</span>
          </label>
        )}
        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        )}
      </form>
    </div>
  );
}
