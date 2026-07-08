"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Users } from "lucide-react";

type Member = {
  id: string;
  userId: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
};

export default function PharmacyStoreTeamClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/pharmacy-store/members");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
      setCanManage(Boolean(data.canManage));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/pharmacy-store/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Erro ao adicionar");
    } else {
      setEmail("");
      await load();
    }
    setSaving(false);
  }

  async function toggleStatus(member: Member) {
    if (!canManage || member.role === "OWNER") return;
    await fetch(`/api/pharmacy-store/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: member.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      }),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {canManage && (
        <form onSubmit={addMember} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="text-emerald-600" size={20} />
            <h2 className="font-bold text-slate-900">Adicionar membro</h2>
          </div>
          <p className="text-xs text-slate-500">
            O usuário precisa ter conta Doctor8 Farmácias (cadastro em /farmacias/cadastro).
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@farmacia.com"
              required
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "STAFF" | "ADMIN")}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="STAFF">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
          {message && <p className="text-xs text-red-600">{message}</p>}
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users size={18} className="text-emerald-600" />
          <h2 className="font-bold text-slate-900">Equipe ({members.length})</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{m.email}</p>
                <p className="text-xs text-slate-500">
                  {m.role} · {m.status === "ACTIVE" ? "Ativo" : "Desativado"}
                </p>
              </div>
              {canManage && m.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => toggleStatus(m)}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-700"
                >
                  {m.status === "ACTIVE" ? "Desativar" : "Reativar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
