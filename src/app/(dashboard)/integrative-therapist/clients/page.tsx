"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PICS_PRACTICES } from "@/lib/pics/practices";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import { initials } from "@/lib/format-name";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  mainPractice: string | null;
  hasAccount: boolean;
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";

export default function IntegrativeClientsPage() {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mainPractice, setMainPractice] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrative-therapist/clients");
      const d = await res.json();
      setClients(d.clients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/integrative-therapist/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email || undefined,
          mainPractice: mainPractice || undefined,
          chiefComplaint: chiefComplaint || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setMainPractice("");
        setChiefComplaint("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  function practiceLabel(slug: string | null) {
    if (!slug) return null;
    const p = PICS_PRACTICES.find((x) => x.slug === slug);
    if (!p) return slug;
    if (lang.startsWith("pt")) return p.labelPt;
    if (lang.startsWith("en")) return p.labelEn;
    return p.labelEs;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("it.nav.clients")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("it.clients.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl"
        >
          <Plus size={16} /> {t("it.clients.add")}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">{t("reg.firstName")}</label>
              <input
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{t("reg.lastName")}</label>
              <input
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("reg.email")}</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.clients.mainPractice")}</label>
            <select
              className={inputClass}
              value={mainPractice}
              onChange={(e) => setMainPractice(e.target.value)}
            >
              <option value="">{t("it.clients.selectPractice")}</option>
              {PICS_PRACTICES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {lang.startsWith("pt") ? p.labelPt : lang.startsWith("en") ? p.labelEn : p.labelEs}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("it.clients.chiefComplaint")}</label>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : t("common.save")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-slate-400" />
          </div>
        ) : clients.length === 0 ? (
          <NoPatientChartsEmptyState variant="teal" onAction={() => setShowForm(true)} />
        ) : (
          <div className="divide-y divide-slate-100">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/integrative-therapist/clients/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm">
                  {initials(c.firstName, c.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {practiceLabel(c.mainPractice) || c.email || t("it.clients.noEmail")}
                  </p>
                </div>
                {c.hasAccount && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {t("it.clients.linked")}
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
