"use client";
// src/app/(dashboard)/admin/jit-events/page.tsx

import { useState, useEffect } from "react";
import {
  AlertTriangle, Plus, X, Loader2, CheckCircle2, AlertCircle,
  Calendar, Users, Power, PowerOff, Tag,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

interface JitEvent {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  forceFree: boolean;
  specialties: string[];
  active: boolean;
  sessionCount: number;
  createdAt: string;
}

export default function AdminJitEventsPage() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [events, setEvents] = useState<JitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fStartAt, setFStartAt] = useState(new Date().toISOString().slice(0, 16));
  const [fEndAt, setFEndAt] = useState("");
  const [fForceFree, setFForceFree] = useState(true);
  const [fSpecialties, setFSpecialties] = useState<string[]>([]);
  const [fSpecInput, setFSpecInput] = useState("");

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    try {
      const res = await fetch("/api/admin/jit-events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function addSpecialty() {
    const s = fSpecInput.trim();
    if (s && !fSpecialties.includes(s)) {
      setFSpecialties([...fSpecialties, s]);
    }
    setFSpecInput("");
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  async function createEvent() {
    if (!fName.trim()) { setError(t("admin.jitEvents.errNameRequired")); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/jit-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName.trim(),
          description: fDesc.trim(),
          startAt: new Date(fStartAt).toISOString(),
          endAt: fEndAt ? new Date(fEndAt).toISOString() : "",
          forceFree: fForceFree,
          specialties: fSpecialties,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("admin.jitEvents.errGeneric")); setSaving(false); return; }
      setSuccessMsg(t("admin.jitEvents.created").replace("{{name}}", fName.trim()));
      setShowForm(false);
      setFName(""); setFDesc(""); setFSpecialties([]); setFForceFree(true);
      await loadEvents();
    } catch { setError(t("common.loadError")); }
    setSaving(false);
  }

  async function toggleEvent(id: string, active: boolean) {
    try {
      await fetch(`/api/admin/jit-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      await loadEvents();
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={24} />
            {t("admin.jitEvents.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("admin.jitEvents.subtitle")}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccessMsg(null); }}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shrink-0"
        >
          <Plus size={18} /> {t("admin.jitEvents.new")}
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">{t("admin.jitEvents.empty")}</p>
          <p className="text-sm text-slate-400 mt-1">{t("admin.jitEvents.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${
              ev.active ? "border-orange-200" : "border-slate-100 opacity-60"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-900">{ev.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ev.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {ev.active ? t("admin.jitEvents.active") : t("admin.jitEvents.closed")}
                    </span>
                    {ev.forceFree && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {t("admin.jitEvents.forceFree")}
                      </span>
                    )}
                  </div>

                  {ev.description && (
                    <p className="text-sm text-slate-500 mb-2">{ev.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> {t("admin.jitEvents.start")} {formatDate(ev.startAt)}
                    </span>
                    {ev.endAt && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {t("admin.jitEvents.end")} {formatDate(ev.endAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {t("admin.jitEvents.sessions").replace("{{count}}", String(ev.sessionCount))}
                    </span>
                  </div>

                  {ev.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ev.specialties.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                          <Tag size={10} /> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleEvent(ev.id, !ev.active)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                      ev.active
                        ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    {ev.active
                      ? <><PowerOff size={13} /> {t("admin.jitEvents.deactivate")}</>
                      : <><Power size={13} /> {t("admin.jitEvents.reactivate")}</>
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" /> {t("admin.jitEvents.formTitle")}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.jitEvents.nameLabel")}</label>
                <input
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder={t("admin.jitEvents.namePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.jitEvents.descLabel")}</label>
                <textarea
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  placeholder={t("admin.jitEvents.descPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 outline-none text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.jitEvents.startLabel")}</label>
                  <input
                    type="datetime-local"
                    value={fStartAt}
                    onChange={(e) => setFStartAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.jitEvents.endLabel")}</label>
                  <input
                    type="datetime-local"
                    value={fEndAt}
                    onChange={(e) => setFEndAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fForceFree}
                    onChange={(e) => setFForceFree(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{t("admin.jitEvents.forceFreeLabel")}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("admin.jitEvents.specialtiesLabel")}</label>
                <div className="flex gap-2">
                  <input
                    value={fSpecInput}
                    onChange={(e) => setFSpecInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty(); } }}
                    placeholder={t("admin.jitEvents.specialtyPlaceholder")}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 outline-none text-sm"
                  />
                  <button
                    onClick={addSpecialty}
                    className="px-3 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 text-sm font-medium transition"
                  >
                    {t("admin.jitEvents.addSpecialty")}
                  </button>
                </div>
                {fSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fSpecialties.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full"
                      >
                        {s}
                        <button
                          onClick={() => setFSpecialties(fSpecialties.filter((x) => x !== s))}
                          className="hover:text-rose-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  onClick={createEvent}
                  disabled={saving || !fName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> {t("admin.jitEvents.creating")}</>
                    : <><AlertTriangle size={14} /> {t("admin.jitEvents.create")}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
