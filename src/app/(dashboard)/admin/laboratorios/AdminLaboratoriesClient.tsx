"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { LABORATORY_TYPE_LABELS } from "@/lib/laboratory-portal";

type Laboratory = {
  id: string;
  cnpj: string;
  nomeFantasia: string;
  labType: string;
  status: string;
  platformFeeCents: number;
  addressCity: string | null;
  addressState: string | null;
  contactEmail: string | null;
  geocoded: boolean;
  examCount: number;
  memberCount: number;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerEmailVerified: boolean;
  ownerLocked: boolean;
  createdAt: string;
};

const STATUSES = ["ALL", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ALL: "Todos",
  PENDING_REVIEW: "Em revisão",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
};

function formatFee(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminLaboratoriesClient() {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/laboratories");
    if (res.ok) {
      const data = await res.json();
      setLaboratories(data.laboratories ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return laboratories;
    return laboratories.filter((lab) => lab.status === statusFilter);
  }, [laboratories, statusFilter]);

  async function verifyOwnerEmail(userId: string | null) {
    if (!userId) return;
    if (!confirm("Confirmar verificação manual do e-mail deste usuário?")) return;
    setSaving(userId);
    await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
    setSaving(null);
    await load();
  }

  async function patchLaboratory(id: string, body: Record<string, unknown>) {
    setSaving(id);
    await fetch(`/api/admin/laboratories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    await load();
  }

  async function saveFee(id: string) {
    const raw = feeDraft[id];
    if (raw == null) return;
    const reais = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(reais) || reais < 0) return;
    await patchLaboratory(id, { platformFeeCents: Math.round(reais * 100) });
    setFeeDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="text-violet-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Laboratórios Doctor8</h1>
            <p className="text-slate-500 text-sm">{filtered.length} de {laboratories.length} laboratórios</p>
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUSES)[number])}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {STATUSES.map((st) => (
            <option key={st} value={st}>{STATUS_LABEL[st]}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Para o laboratório conseguir entrar, o <strong>e-mail do usuário</strong> precisa estar verificado.
        Ativar o laboratório verifica o e-mail do responsável automaticamente. Use o botão abaixo se já estiver ativo.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Laboratório</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">E-mail login</th>
              <th className="px-4 py-3 font-medium">Taxa Doctor8</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Exames</th>
              <th className="px-4 py-3 font-medium">Equipe</th>
              <th className="px-4 py-3 font-medium">Geo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lab) => (
              <tr key={lab.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{lab.nomeFantasia}</p>
                  <p className="text-xs text-slate-400">{lab.cnpj}</p>
                  {lab.contactEmail && (
                    <p className="text-xs text-slate-500 mt-0.5">{lab.contactEmail}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px]">
                  {LABORATORY_TYPE_LABELS[lab.labType] ?? lab.labType}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={lab.status}
                    disabled={saving === lab.id}
                    onChange={(e) => patchLaboratory(lab.id, { status: e.target.value })}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {STATUSES.filter((st) => st !== "ALL").map((st) => (
                      <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {lab.ownerEmailVerified ? (
                    <span className="text-emerald-700 text-xs font-medium">Verificado</span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-amber-700 text-xs font-medium block">Pendente</span>
                      {lab.ownerUserId && (
                        <button
                          type="button"
                          disabled={saving === lab.ownerUserId}
                          onClick={() => verifyOwnerEmail(lab.ownerUserId)}
                          className="text-xs text-violet-700 font-semibold disabled:opacity-40"
                        >
                          Verificar e-mail
                        </button>
                      )}
                    </div>
                  )}
                  {lab.ownerLocked && (
                    <p className="text-[10px] text-red-600 mt-1">Conta bloqueada</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={(lab.platformFeeCents / 100).toFixed(2).replace(".", ",")}
                      onChange={(e) => setFeeDraft((prev) => ({ ...prev, [lab.id]: e.target.value }))}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={saving === lab.id || feeDraft[lab.id] == null}
                      onClick={() => saveFee(lab.id)}
                      className="text-xs text-violet-700 font-semibold disabled:opacity-40"
                    >
                      OK
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatFee(lab.platformFeeCents)} atual</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[lab.addressCity, lab.addressState].filter(Boolean).join("/") || "—"}
                </td>
                <td className="px-4 py-3">{lab.examCount}</td>
                <td className="px-4 py-3">{lab.memberCount}</td>
                <td className="px-4 py-3">{lab.geocoded ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
