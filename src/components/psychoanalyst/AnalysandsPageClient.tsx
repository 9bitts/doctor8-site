"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { formatShortDateWithYear } from "@/lib/timezone";
import { initials } from "@/lib/psychoanalyst-initials";
import { Loader2, Plus, ChevronRight, Search } from "lucide-react";

interface Analysand {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
  processStartDate: string | null;
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40";

const SESSION_FREQ_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "semanal", labelKey: "pa.analysands.freq.semanal" },
  { value: "2x/semana", labelKey: "pa.analysands.freq.2xSemana" },
  { value: "3x/semana", labelKey: "pa.analysands.freq.3xSemana" },
  { value: "quinzenal", labelKey: "pa.analysands.freq.quinzenal" },
  { value: "livre", labelKey: "pa.analysands.freq.livre" },
];

function AnalysandsPageInner({ timeZone }: { timeZone: string }) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [analysands, setAnalysands] = useState<Analysand[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionFrequency, setSessionFrequency] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedUserId, setLinkedUserId] = useState<string | undefined>();

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

  useEffect(() => {
    const prefillFirst = searchParams.get("prefillFirst");
    const prefillLast = searchParams.get("prefillLast");
    const prefillUserId = searchParams.get("prefillUserId");
    if (prefillFirst || prefillLast || prefillUserId) {
      if (prefillFirst) setFirstName(prefillFirst);
      if (prefillLast) setLastName(prefillLast);
      if (prefillUserId) setLinkedUserId(prefillUserId);
      setShowForm(true);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return analysands;
    return analysands.filter((a) => {
      const name = `${a.firstName} ${a.lastName}`.toLowerCase();
      const emailMatch = (a.email || "").toLowerCase();
      return name.includes(q) || emailMatch.includes(q);
    });
  }, [analysands, search]);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSessionFrequency("");
    setNotes("");
    setLinkedUserId(undefined);
    setFormError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/psychoanalyst/analysands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
          sessionFrequency: sessionFrequency || undefined,
          notes: notes || undefined,
          linkedUserId,
        }),
      });
      if (!res.ok) {
        setFormError(t("pa.analysands.errCreate"));
        return;
      }
      setShowForm(false);
      resetForm();
      load();
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
          onClick={() => { resetForm(); setShowForm(true); }}
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
          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.analysands.phone")}</label>
            <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.analysands.sessionFrequency")}</label>
            <select
              className={inputClass}
              value={sessionFrequency}
              onChange={(e) => setSessionFrequency(e.target.value)}
            >
              <option value="">{t("pa.analysands.freqNone")}</option>
              {SESSION_FREQ_OPTIONS.map(({ value, labelKey }) => (
                <option key={value} value={value}>{t(labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("pa.analysands.notes")}</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : t("common.save")}
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pa.analysands.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-16">
            {search.trim() ? t("pa.analysands.noResults") : t("pa.analysands.empty")}
          </p>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/60">
            {filtered.map((a) => (
              <Link
                key={a.id}
                href={`/psychoanalyst/analysands/${a.id}`}
                className="flex items-center gap-4 px-4 py-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-sm">
                  {initials(a.firstName, a.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-slate-500 truncate">{a.email || t("pa.analysands.noEmail")}</p>
                  {a.processStartDate && (
                    <p className="text-[11px] text-violet-600 mt-0.5">
                      {t("pa.analysands.processStart")}{" "}
                      {formatShortDateWithYear(new Date(a.processStartDate), timeZone, locale)}
                    </p>
                  )}
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

export default function AnalysandsPageClient({ timeZone }: { timeZone: string }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>}>
      <AnalysandsPageInner timeZone={timeZone} />
    </Suspense>
  );
}
