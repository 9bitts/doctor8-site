"use client";

// src/app/(dashboard)/professional/patients/PatientsClient.tsx
// Client UI for the professional's patient charts: list + create new chart. i18n via useT().
// P1-a: added phone (required) + registration data (birth, sex, CPF, address) used by the
// prescription (CFM superinscription). Registration fields can be filled now or later.

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { professionalPatientsHref } from "@/lib/psychologist-portal";
import { useT, useI18n } from "@/lib/i18n/I18nProvider";
import { Plus, X, ChevronRight, CheckCircle2, AlertCircle, Search, Send, Loader2 } from "lucide-react";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";

interface Chart {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
  updatedAt: string;
  access?: "owner" | "edit" | "view";
  ownerName?: string;
  sharedVia?: string;
}

type DuplicateMatch = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  reason: "email" | "name";
};

export default function PatientsClient({ initialCharts }: { initialCharts: Chart[] }) {
  const pathname = usePathname();
  const t = useT();
  const { lang } = useI18n();
  const [charts, setCharts] = useState<Chart[]>(initialCharts);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<Record<string, "sent" | "error">>({});
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[] | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // P1-a: registration data (used by the prescription)
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("");
  const [cpf, setCpf] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [country, setCountry] = useState("BR");
  const [zipCode, setZipCode] = useState("");

  function resetForm() {
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setNotes("");
    setDateOfBirth(""); setSex(""); setCpf("");
    setAddressLine1(""); setCity(""); setStateField(""); setCountry("BR"); setZipCode("");
    setError(null);
  }

  async function handleCreate(forceDuplicate = false) {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("pat.errNameRequired"));
      return;
    }
    if (!phone.trim()) {
      setError(t("pat.errPhoneRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/professional/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, notes,
          dateOfBirth, sex, cpf,
          addressLine1, city, state: stateField, country, zipCode,
          forceDuplicate,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === "POSSIBLE_DUPLICATE") {
        setDuplicateMatches(data.matches || []);
        setSaving(false);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("pat.errCreate"));
        setSaving(false);
        return;
      }
      setDuplicateMatches(null);
      setCharts((prev) => [
        {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          hasAccount: data.hasAccount,
          updatedAt: new Date().toISOString(),
          access: "owner" as const,
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

  const filteredCharts = useMemo(
    () => filterPatientCharts(charts, search, charts.length),
    [charts, search],
  );

  async function sendInvite(chartId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setInvitingId(chartId);
    setInviteFeedback((prev) => {
      const next = { ...prev };
      delete next[chartId];
      return next;
    });
    try {
      const res = await fetch(`/api/professional/records/${chartId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      setInviteFeedback((prev) => ({
        ...prev,
        [chartId]: res.ok ? "sent" : "error",
      }));
    } catch {
      setInviteFeedback((prev) => ({ ...prev, [chartId]: "error" }));
    }
    setInvitingId(null);
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
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Plus size={18} /> {t("pat.new")}
        </button>
      </div>

      {charts.length > 0 && (
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pat.searchPlaceholder")}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {charts.length === 0 ? (
          <div className="py-8 px-4">
            <NoPatientChartsEmptyState onAction={() => { setShowForm(true); resetForm(); }} />
          </div>
        ) : filteredCharts.length === 0 ? (
          <div className="text-center py-16">
            <Search className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">{t("pat.searchEmpty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCharts.map((c) => (
              <Link
                key={c.id}
                href={professionalPatientsHref(pathname, c.id)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
                  {c.firstName[0] || "?"}{c.lastName[0] || ""}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {c.firstName} {c.lastName}
                  </p>
                  {c.access && c.access !== "owner" && (
                    <p className="text-[11px] text-violet-600 mt-0.5">
                      {t("pat.sharedChart")} · {c.ownerName}
                      {c.access === "view" ? ` · ${t("pat.accessView")}` : ` · ${t("pat.accessEdit")}`}
                    </p>
                  )}
                  <div className="text-xs mt-0.5">
                    {c.access === "view" ? (
                      <span className="text-slate-500">{t("pat.accessViewOnly")}</span>
                    ) : (
                    <>
                    {c.hasAccount ? (
                      <span className="text-brand-500 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t("pat.hasAccount")}
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-start gap-1.5">
                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
                        <span className="leading-snug">{t("pat.noAccount")}</span>
                      </span>
                    )}
                    {!c.hasAccount && !c.email && c.access === "owner" && (
                      <span className="text-brand-600 mt-1.5 inline-block font-medium">
                        {t("pat.openChartToAddEmail")} →
                      </span>
                    )}
                    {!c.hasAccount && c.email && (c.access === "owner" || c.access === "edit") && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => sendInvite(c.id, e)}
                          disabled={invitingId === c.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 px-2.5 py-1 rounded-lg disabled:opacity-50 transition"
                        >
                          {invitingId === c.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}
                          {t("pat.sendInvite")}
                        </button>
                        {inviteFeedback[c.id] === "sent" && (
                          <span className="text-xs text-brand-600 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> {t("pat.inviteSent")}
                          </span>
                        )}
                        {inviteFeedback[c.id] === "error" && (
                          <span className="text-xs text-rose-600">{t("pat.inviteError")}</span>
                        )}
                      </div>
                    )}
                    </>
                    )}
                  </div>
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.lastName")}</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.phone")} *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                />
              </div>

              {/* ── Registration data (for the prescription) ── */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t("pat.regSection")}</p>
                <p className="text-xs text-slate-400 mb-3">{t("pat.regHint")}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.dob")}</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.sex")}</label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm bg-white"
                    >
                      <option value="">{t("pat.sexSelect")}</option>
                      <option value="F">{t("pat.sexF")}</option>
                      <option value="M">{t("pat.sexM")}</option>
                      <option value="O">{t("pat.sexO")}</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t("pat.cpf")} <span className="text-slate-400">{t("pat.cpfHint")}</span>
                  </label>
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.address")}</label>
                  <input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder={t("pat.addressPlaceholder")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.city")}</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.state")}</label>
                    <input
                      value={stateField}
                      onChange={(e) => setStateField(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.country")}</label>
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.zip")}</label>
                    <input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("pat.notes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
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
                  onClick={() => handleCreate(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? t("pat.creating") : t("pat.create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicateMatches && duplicateMatches.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={22} />
              <div>
                <h3 className="font-bold text-slate-900">{t("pat.duplicateTitle")}</h3>
                <p className="text-sm text-slate-600 mt-1">{t("pat.duplicateMessage")}</p>
              </div>
            </div>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {duplicateMatches.map((m) => (
                <li key={m.id}>
                  <Link
                    href={professionalPatientsHref(pathname, m.id)}
                    className="block rounded-xl border border-slate-200 px-3 py-2 hover:border-brand-200 hover:bg-brand-50/50 transition text-sm"
                    onClick={() => setDuplicateMatches(null)}
                  >
                    <span className="font-medium text-slate-900">
                      {m.firstName} {m.lastName}
                    </span>
                    {m.email && (
                      <span className="text-slate-500 block text-xs">{m.email}</span>
                    )}
                    <span className="text-xs text-brand-600 mt-1 inline-block">
                      {t("pat.duplicateOpenExisting")} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateMatches(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleCreate(true)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"
              >
                {t("pat.duplicateCreateAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
