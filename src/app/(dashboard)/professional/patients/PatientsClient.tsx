"use client";

// src/app/(dashboard)/professional/patients/PatientsClient.tsx
// Client UI for the professional's patient charts: list + create new chart. i18n via useT().

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";
import { Users, Plus, X, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

interface Chart {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
  updatedAt: string;
}

export default function PatientsClient({ initialCharts }: { initialCharts: Chart[] }) {
  const t = useT();
  const [charts, setCharts] = useState<Chart[]>(initialCharts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setNotes("");
    setError(null);
  }

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("pat.errNameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/professional/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("pat.errCreate"));
        setSaving(false);
        return;
      }
      setCharts((prev) => [
        {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          hasAccount: data.hasAccount,
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
    } catch {
      setError(t("pat.errNetwork"));
    }
    setSaving(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("pat.title")}</h1>
          <p className="text-slate-500 mt-1">
            {charts.length} {charts.length === 1 ? t("pat.chart") : t("pat.charts")}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Plus size={18} /> {t("pat.new")}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {charts.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">{t("pat.empty")}</p>
            <p className="text-slate-400 text-xs mt-1">{t("pat.emptyHint")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {charts.map((c) => (
              <Link
                key={c.id}
                href={`/professional/patients/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-sm shrink-0">
                  {c.firstName[0]}{c.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs mt-0.5">
                    {c.hasAccount ? (
                      <span className="text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t("pat.hasAccount")}
                      </span>
                    ) : (
                      <span className="text-amber-600 inline-flex items-center gap-1">
                        <AlertCircle size={12} /> {t("pat.noAccount")}
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New chart modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">{t("pat.modalTitle")}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.firstName")}</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.lastName")}</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t("pat.email")} <span className="text-slate-400">{t("pat.emailHint")}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@email.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.phone")}</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.notes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? t("pat.creating") : t("pat.create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
