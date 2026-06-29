"use client";

import { useState, useEffect } from "react";
import { Copy, Loader2, Users, Stethoscope, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Staff = { id: string; email: string; role: string; status: string };
type Prof = {
  id: string;
  professionalId: string;
  providerType?: string;
  name: string;
  specialty: string;
  email: string;
  repassePercent: number;
  status: string;
};

export default function OrganizationTeamPage() {
  const { t } = useI18n();
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

  async function saveRepasse(scopeKey: string) {
    const repassePercent = repasseEdits[scopeKey];
    if (repassePercent === undefined) return;
    await fetch("/api/organization/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scopeKey, repassePercent }),
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
        <h1 className="text-2xl font-bold text-slate-900">{t("org.team.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("org.team.subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-2">{t("org.team.inviteCodeTitle")}</h2>
        <p className="text-sm text-slate-500 mb-4">{t("org.team.inviteCodeDesc")}</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 truncate">
            {inviteCode}
          </code>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-indigo-500 transition"
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? t("org.team.copied") : t("org.team.copy")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope size={18} className="text-violet-600" />
          <h2 className="font-semibold text-slate-900">
            {t("org.team.professionals").replace("{{n}}", String(professionals.length))}
          </h2>
        </div>
        {professionals.length === 0 ? (
          <p className="text-slate-400 text-sm">{t("org.team.noProfessionals")}</p>
        ) : (
          <div className="space-y-3">
            {professionals.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 gap-4">
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.specialty}{p.email ? ` · ${p.email}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">{t("org.team.repasse")}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={p.repassePercent}
                    onChange={(e) =>
                      setRepasseEdits((prev) => ({
                        ...prev,
                        [p.id]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
                  />
                  <button
                    onClick={() => saveRepasse(p.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {t("common.save")}
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
          <h2 className="font-semibold text-slate-900">
            {t("org.team.staff").replace("{{n}}", String(staff.length))}
          </h2>
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
              placeholder={t("org.team.staffEmailPlaceholder")}
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
              <option value="RECEPTIONIST">Recepção</option>
              <option value="FINANCE">Financeiro</option>
              <option value="HR">RH</option>
              <option value="ACCOUNTANT">Contabilidade</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {inviting ? t("org.team.inviting") : t("org.team.invite")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
