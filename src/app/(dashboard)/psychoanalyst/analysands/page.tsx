"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Plus, ChevronRight } from "lucide-react";

interface Analysand {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40";

export default function AnalysandsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [analysands, setAnalysands] = useState<Analysand[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/psychoanalyst/analysands");
      const d = await res.json();
      setAnalysands(d.analysands || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/psychoanalyst/analysands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email: email || undefined }),
      });
      if (res.ok) {
        setShowForm(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("pa.nav.analysands")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("pa.analysands.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl"
        >
          <Plus size={16} /> {t("pa.analysands.add")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">{t("reg.firstName")}</label>
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("reg.lastName")}</label>
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("reg.email")}</label>
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : t("common.save")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : analysands.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-16">{t("pa.analysands.empty")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {analysands.map((a) => (
              <Link
                key={a.id}
                href={`/psychoanalyst/analysands/${a.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-sm">
                  {a.firstName[0]}{a.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-slate-500 truncate">{a.email || t("pa.analysands.noEmail")}</p>
                </div>
                {a.hasAccount && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {t("pa.analysands.linked")}
                  </span>
                )}
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
