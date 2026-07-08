"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, Mail } from "lucide-react";

type Staff = {
  id: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  userId?: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "SST", label: "SST / Segurança do Trabalho" },
  { value: "HR", label: "RH" },
  { value: "VIEWER", label: "Visualizador" },
];

export default function EquipePage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("HR");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/members");
      const data = await res.json();
      if (res.ok) {
        setStaff(data.staff || []);
        setPendingInvites(data.pendingInvites || []);
        setCanManage(data.canManageTeam);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function inviteStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage("");
    try {
      const res = await fetch("/api/employer/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteEmail("");
        setMessage("Convite enviado por e-mail.");
        await load();
      } else {
        setMessage(data.error === "ALREADY_MEMBER" ? "Este e-mail já faz parte da equipe." : "Erro ao enviar convite.");
      }
    } finally {
      setInviting(false);
    }
  }

  async function updateMember(id: string, patch: { role?: string; status?: string }) {
    const res = await fetch(`/api/employer/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await load();
    else alert("Não foi possível atualizar o membro.");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Equipe Doctor8 Empresas</h1>
        <p className="text-slate-500 text-sm mt-1">
          Convide membros SST, RH e visualizadores. Papéis: Owner, Admin, SST, HR, Viewer.
        </p>
      </div>

      {canManage && (
        <form onSubmit={inviteStaff} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-sky-600" />
            <h2 className="font-semibold text-slate-900">Convidar por e-mail</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {inviting ? "Enviando…" : "Enviar convite"}
            </button>
          </div>
          {message && <p className="text-sm text-emerald-700">{message}</p>}
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-sky-600" />
          <h2 className="font-semibold text-slate-900">Membros ativos ({staff.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {staff.map((m) => (
            <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="font-medium text-slate-900">{m.email}</p>
                <p className="text-xs text-slate-500">{m.status} · desde {new Date(m.joinedAt).toLocaleDateString("pt-BR")}</p>
              </div>
              {canManage && m.role !== "OWNER" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => updateMember(m.id, { role: e.target.value })}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {m.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => updateMember(m.id, { status: "DISABLED" })}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateMember(m.id, { status: "ACTIVE" })}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Reativar
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400">{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-900 mb-3">Convites pendentes</h2>
          <ul className="space-y-2 text-sm text-amber-800">
            {pendingInvites.map((i) => (
              <li key={i.id}>
                {i.email} — {i.role} (expira {new Date(i.expiresAt).toLocaleDateString("pt-BR")})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
