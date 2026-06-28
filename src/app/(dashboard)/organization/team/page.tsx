"use client";

import { useState, useEffect } from "react";
import { Copy, Loader2, Users, Stethoscope, CheckCircle2 } from "lucide-react";

type Staff = { id: string; email: string; role: string; status: string };
type Prof = {
  id: string;
  professionalId: string;
  name: string;
  specialty: string;
  email: string;
  repassePercent: number;
  status: string;
};

export default function OrganizationTeamPage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [professionals, setProfessionals] = useState<Prof[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("RECEPTIONIST");
  const [inviting, setInviting] = useState(false);
  const [repasseEdits, setRepasseEdits] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/organization/members");
      const data = await res.json();
      if (res.ok) {
        setStaff(data.staff || []);
        setProfessionals(data.professionals || []);
        setInviteCode(data.inviteCode || "");
        setCanManage(data.canManageTeam);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function inviteStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await fetch("/api/organization/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteEmail("");
      await load();
    } finally {
      setInviting(false);
    }
  }

  async function saveRepasse(professionalId: string) {
    const repassePercent = repasseEdits[professionalId];
    if (repassePercent === undefined) return;
    await fetch("/api/organization/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId, repassePercent }),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Equipe</h1>
        <p className="text-slate-500 text-sm mt-1">Colaboradores e profissionais vinculados</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-2">C\u00f3digo para profissionais</h2>
        <p className="text-sm text-slate-500 mb-4">
          M\u00e9dicos cadastrados no Doctor8 podem vincular-se \u00e0 cl\u00ednica em Configura\u00e7\u00f5es \u2192 Organiza\u00e7\u00e3o, usando este c\u00f3digo.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 truncate">
            {inviteCode}
          </code>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-indigo-500 transition"
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope size={18} className="text-violet-600" />
          <h2 className="font-semibold text-slate-900">Profissionais ({professionals.length})</h2>
        </div>
        {professionals.length === 0 ? (
          <p className="text-slate-400 text-sm">Nenhum profissional vinculado ainda.</p>
        ) : (
          <div className="space-y-3">
            {professionals.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 gap-4">
                <div>
                  <p className="font-medium text-slate-900">Dr. {p.name}</p>
                  <p className="text-xs text-slate-500">{p.specialty} \u00b7 {p.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Repasse %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={p.repassePercent}
                    onChange={(e) =>
                      setRepasseEdits((prev) => ({
                        ...prev,
                        [p.professionalId]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
                  />
                  <button
                    onClick={() => saveRepasse(p.professionalId)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900">Colaboradores ({staff.length})</h2>
        </div>
        <div className="space-y-2 mb-6">
          {staff.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-700">{m.email}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{m.role}</span>
            </div>
          ))}
        </div>

        {canManage && (
          <form onSubmit={inviteStaff} className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
            <input
              type="email"
              placeholder="E-mail do colaborador"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-4 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="ADMIN">Admin</option>
              <option value="RECEPTIONIST">Recep??o</option>
              <option value="FINANCE">Financeiro</option>
              <option value="HR">RH</option>
              <option value="ACCOUNTANT">Contabilidade</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {inviting ? "Enviando?" : "Convidar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
