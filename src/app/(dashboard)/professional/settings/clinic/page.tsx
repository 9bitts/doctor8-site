"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Building2, Copy, Loader2, Users, CheckCircle2 } from "lucide-react";

export default function ClinicSettingsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [clinic, setClinic] = useState<{
    id: string;
    name: string;
    inviteCode: string;
    role: string;
    members: { id: string; name: string; specialty: string; role: string }[];
  } | null>(null);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/professional/clinic");
      const data = await res.json();
      if (res.ok) setClinic(data.clinic);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createClinic() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/professional/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "ALREADY_IN_CLINIC" ? t("clinic.alreadyMember") : t("clinic.createError"));
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function joinClinic() {
    if (!inviteCode.trim()) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/professional/clinic/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "CLINIC_NOT_FOUND" ? t("clinic.codeNotFound")
            : data.error === "ALREADY_IN_CLINIC" ? t("clinic.alreadyMember")
              : t("clinic.joinError"),
        );
        return;
      }
      setInviteCode("");
      await load();
    } finally {
      setJoining(false);
    }
  }

  function copyCode() {
    if (!clinic?.inviteCode) return;
    navigator.clipboard.writeText(clinic.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/professional/settings" className="text-sm text-slate-500 hover:text-brand-600">
          ? {t("common.back")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
          <Building2 size={24} className="text-brand-500" />
          {t("clinic.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("clinic.subtitle")}</p>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      {clinic ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">{t("clinic.yourTeam")}</p>
            <p className="text-lg font-bold text-slate-900">{clinic.name}</p>
            <p className="text-xs text-slate-400 mt-1">{t("clinic.yourRole")}: {clinic.role}</p>
          </div>

          {(clinic.role === "OWNER" || clinic.role === "ADMIN") && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">{t("clinic.inviteCode")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white border border-slate-200 rounded-lg px-3 py-2">
                  {clinic.inviteCode}
                </code>
                <button type="button" onClick={copyCode}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 border border-brand-200 px-3 py-2 rounded-lg hover:bg-brand-50">
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? t("clinic.copied") : t("clinic.copy")}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">{t("clinic.inviteHint")}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
              <Users size={14} /> {t("clinic.members")} ({clinic.members.length})
            </p>
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {clinic.members.map((m) => (
                <li key={m.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.specialty}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">{t("clinic.createTitle")}</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("clinic.namePlaceholder")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button type="button" onClick={createClinic} disabled={saving || !name.trim()}
              className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : t("clinic.create")}
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">{t("clinic.joinTitle")}</h2>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("clinic.codePlaceholder")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
            />
            <button type="button" onClick={joinClinic} disabled={joining || !inviteCode.trim()}
              className="w-full py-2.5 rounded-xl border border-brand-200 text-brand-700 text-sm font-semibold hover:bg-brand-50 disabled:opacity-50">
              {joining ? <Loader2 size={14} className="animate-spin mx-auto" /> : t("clinic.join")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
