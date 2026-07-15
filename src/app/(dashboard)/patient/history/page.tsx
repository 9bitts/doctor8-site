"use client";

// src/app/(dashboard)/patient/history/page.tsx
// Complete medical history (anamnesis). UI + clinical options are i18n-aware.

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { histOptionLabel } from "@/lib/i18n/hist-option-labels";
import type { HistOption } from "@/lib/medical-history-options";
import {
  HIST_YES_NO,
  HIST_SEX,
  HIST_MARITAL,
  HIST_BLOOD_TYPES,
  HIST_DISABILITIES,
  HIST_CHRONIC,
  HIST_SMOKING,
  HIST_ALCOHOL,
  HIST_EXERCISE,
  HIST_SLEEP,
  HIST_MENSTRUAL,
  HIST_IMMUNOLOGY,
  HIST_VACCINES,
  HIST_SUBSTANCES,
  HIST_INFECTIOUS,
  HIST_REVIEW_SYSTEMS,
} from "@/lib/medical-history-options";
import {
  clearHistoryDraft,
  isHistoryDraftEmpty,
  loadHistoryDraft,
  saveHistoryDraft,
} from "@/lib/history-draft";
import { Save, Share2, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import ShareModal from "@/components/ShareModal";

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  optLabel,
}: {
  label: string;
  options: HistOption[];
  selected: string[];
  onToggle: (v: string) => void;
  optLabel: (key: string) => string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"
              }`}
            >
              {optLabel(o.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OptionSelect({
  value,
  onChange,
  options,
  placeholder,
  optLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: HistOption[];
  placeholder: string;
  optLabel: (key: string) => string;
  className: string;
}) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {optLabel(o.labelKey)}
        </option>
      ))}
    </select>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 text-base">{title}</h2>
      {children}
    </div>
  );
}

interface HistoryData {
  isMinor: string; guardianName: string;
  patientName: string; motherName: string;
  sexAtBirth: string; profession: string; maritalStatus: string;
  healthInsurance: string; weight: string; height: string;
  bloodType: string;
  disabilities: string[];
  chronicConditions: string[];
  chiefComplaint: string; complaintDuration: string;
  painScale: string; betterFactors: string; worseFactors: string;
  pastSurgeries: string; currentMedications: string;
  familyHistory: string; allergies: string;
  recentTravel: string; ruralAreas: string;
  smokingStatus: string; alcoholUse: string; exerciseFrequency: string; sleepQuality: string;
  reviewSystems: string[];
  menstrualDuration: string; menstrualCycle: string[];
  immunology: string[]; vaccines: string[]; vaccineReactions: string;
  substances: string[];
  infectious: string[]; otherInfectious: string;
  notes: string;
}

const EMPTY: HistoryData = {
  isMinor: "", guardianName: "", patientName: "", motherName: "",
  sexAtBirth: "", profession: "", maritalStatus: "", healthInsurance: "",
  weight: "", height: "", bloodType: "", disabilities: [], chronicConditions: [],
  chiefComplaint: "", complaintDuration: "", painScale: "", betterFactors: "", worseFactors: "",
  pastSurgeries: "", currentMedications: "", familyHistory: "", allergies: "",
  recentTravel: "", ruralAreas: "", smokingStatus: "", alcoholUse: "",
  exerciseFrequency: "", sleepQuality: "", reviewSystems: [],
  menstrualDuration: "", menstrualCycle: [], immunology: [], vaccines: [],
  vaccineReactions: "", substances: [], infectious: [], otherInfectious: "", notes: "",
};

const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40";
const textareaClass = inputClass + " resize-none";
const selectClass = inputClass + " bg-white";

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const optLabel = (key: string) => histOptionLabel(lang, key);
  const [data, setData] = useState<HistoryData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftReadyRef = useRef(false);
  const draftHydratedRef = useRef(false);
  const suppressDraftRef = useRef(false);

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("share") === "1") {
      setShowShareModal(true);
      params.delete("share");
      const qs = params.toString();
      window.history.replaceState({}, "", `/patient/history${qs ? `?${qs}` : ""}`);
    }
  }, []);

  useEffect(() => {
    if (loading || loadError || !userId || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const draft = loadHistoryDraft(userId);
    if (draft && !isHistoryDraftEmpty(draft)) {
      setData({ ...EMPTY, ...(draft as unknown as HistoryData) });
      setDraftRestored(true);
    }
    draftReadyRef.current = true;
  }, [loading, loadError, userId]);

  useEffect(() => {
    if (!draftReadyRef.current || !userId || suppressDraftRef.current) return;
    saveHistoryDraft(userId, data as unknown as Record<string, unknown>);
    if (isHistoryDraftEmpty(data as unknown as Record<string, unknown>)) {
      setDraftSaved(false);
      return;
    }
    setDraftSaved(true);
    const timer = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [data, userId]);

  async function fetchHistory() {
    setLoading(true);
    setLoadError(false);
    draftReadyRef.current = false;
    draftHydratedRef.current = false;
    suppressDraftRef.current = false;
    setDraftRestored(false);
    try {
      const res = await fetch("/api/patient/history");
      // A failed load must block the form — otherwise saving would
      // overwrite the stored anamnesis with an empty one.
      if (!res.ok) { setLoadError(true); return; }
      const d = await res.json();
      if (d.history) {
        const rawCc = d.history.chronicConditions;
        const chronicConditions: string[] = Array.isArray(rawCc)
          ? rawCc.filter((x: unknown): x is string => typeof x === "string")
          : typeof rawCc === "string" && rawCc.trim()
            ? rawCc.split(/,\s*/).map((s: string) => s.trim()).filter(Boolean)
            : [];
        setData({ ...EMPTY, ...d.history, chronicConditions });
      } else {
        setData(EMPTY);
      }
    } catch {
      setLoadError(true);
    } finally { setLoading(false); }
  }

  function set<K extends keyof HistoryData>(key: K, value: HistoryData[K]) {
    suppressDraftRef.current = false;
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: keyof HistoryData, value: string) {
    suppressDraftRef.current = false;
    setData((prev) => {
      const arr = (prev[key] as string[]) || [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!data.isMinor) {
      setError(t("hist.errFirst"));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/patient/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        setError(t("hist.errSave"));
        return;
      }
      if (userId) clearHistoryDraft(userId);
      suppressDraftRef.current = true;
      setDraftRestored(false);
      setDraftSaved(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t("hist.errSave"));
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>;
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center gap-3 py-16 px-4 text-center bg-white border border-slate-100 rounded-2xl">
          <AlertCircle size={24} className="text-amber-500" />
          <p className="text-sm text-slate-600">{t("common.loadError")}</p>
          <button type="button" onClick={fetchHistory} className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
            <RefreshCw size={14} /> {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-3xl mx-auto space-y-6 pb-10">
      <div className="sticky top-3 z-20 h-0 overflow-visible pointer-events-none flex justify-end">
        {draftSaved && !saved && (
          <p className="pointer-events-auto text-xs text-slate-600 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
            <CheckCircle2 size={12} className="text-emerald-500" /> {t("hist.draftSaved")}
          </p>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("hist.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("hist.subtitle")}</p>
      </div>

      {draftRestored && !saved && (
        <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
          <CheckCircle2 className="text-sky-500 shrink-0" size={20} />
          <p className="text-sky-800 text-sm font-medium">{t("hist.draftRestored")}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-emerald-700 text-sm font-medium">{t("hist.saved")}</p>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4"><p className="text-rose-700 text-sm">{error}</p></div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        <Section title={t("hist.sec.identification")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.isMinor")}</label>
            <div className="flex gap-2">
              {HIST_YES_NO.map((o) => (
                <button key={o.value} type="button" onClick={() => set("isMinor", o.value)}
                  className={`text-sm px-4 py-2 rounded-xl border transition ${data.isMinor === o.value ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                  {optLabel(o.labelKey)}
                </button>
              ))}
            </div>
          </div>
          {data.isMinor === "Yes" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.guardianName")}</label>
              <input className={inputClass} value={data.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.patientName")}</label>
              <input className={inputClass} value={data.patientName} onChange={(e) => set("patientName", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.motherName")}</label>
              <input className={inputClass} value={data.motherName} onChange={(e) => set("motherName", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.sexAtBirth")}</label>
              <OptionSelect value={data.sexAtBirth} onChange={(v) => set("sexAtBirth", v)} options={HIST_SEX}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.maritalStatus")}</label>
              <OptionSelect value={data.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={HIST_MARITAL}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.profession")}</label>
              <input className={inputClass} value={data.profession} onChange={(e) => set("profession", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.healthInsurance")}</label>
              <input className={inputClass} value={data.healthInsurance} onChange={(e) => set("healthInsurance", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.weight")}</label>
              <input type="number" className={inputClass} value={data.weight} onChange={(e) => set("weight", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.height")}</label>
              <input type="number" className={inputClass} value={data.height} onChange={(e) => set("height", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.bloodType")}</label>
              <OptionSelect value={data.bloodType} onChange={(v) => set("bloodType", v)} options={HIST_BLOOD_TYPES}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
          </div>
          <ChipGroup label={t("hist.disabilities")} options={HIST_DISABILITIES}
            selected={data.disabilities} onToggle={(v) => toggleArray("disabilities", v)} optLabel={optLabel} />
        </Section>

        <Section title={t("hist.sec.reason")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.chiefComplaint")}</label>
            <textarea rows={3} className={textareaClass} value={data.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.complaintDuration")}</label>
              <input className={inputClass} value={data.complaintDuration} onChange={(e) => set("complaintDuration", e.target.value)} placeholder={t("hist.durationPlaceholder")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.painScale")}</label>
              <input type="number" min="0" max="10" className={inputClass} value={data.painScale} onChange={(e) => set("painScale", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.betterFactors")}</label>
              <input className={inputClass} value={data.betterFactors} onChange={(e) => set("betterFactors", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.worseFactors")}</label>
              <input className={inputClass} value={data.worseFactors} onChange={(e) => set("worseFactors", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title={t("hist.sec.background")}>
          <ChipGroup label={t("hist.chronic")} options={HIST_CHRONIC}
            selected={data.chronicConditions} onToggle={(v) => toggleArray("chronicConditions", v)} optLabel={optLabel} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.pastSurgeries")}</label>
            <textarea rows={2} className={textareaClass} value={data.pastSurgeries} onChange={(e) => set("pastSurgeries", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              {t("hist.currentMeds")} <span className="text-slate-400 font-normal">{t("hist.currentMedsHint")}</span>
            </label>
            <textarea rows={3} className={textareaClass} value={data.currentMedications} onChange={(e) => set("currentMedications", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.familyHistory")}</label>
            <textarea rows={2} className={textareaClass} value={data.familyHistory} onChange={(e) => set("familyHistory", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.allergies")}</label>
            <textarea rows={2} className={textareaClass} value={data.allergies} onChange={(e) => set("allergies", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.recentTravel")}</label>
              <input className={inputClass} value={data.recentTravel} onChange={(e) => set("recentTravel", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.ruralAreas")}</label>
              <input className={inputClass} value={data.ruralAreas} onChange={(e) => set("ruralAreas", e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title={t("hist.sec.lifestyle")}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.smoking")}</label>
              <OptionSelect value={data.smokingStatus} onChange={(v) => set("smokingStatus", v)} options={HIST_SMOKING}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.alcohol")}</label>
              <OptionSelect value={data.alcoholUse} onChange={(v) => set("alcoholUse", v)} options={HIST_ALCOHOL}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.exercise")}</label>
              <OptionSelect value={data.exerciseFrequency} onChange={(v) => set("exerciseFrequency", v)} options={HIST_EXERCISE}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.sleep")}</label>
              <OptionSelect value={data.sleepQuality} onChange={(v) => set("sleepQuality", v)} options={HIST_SLEEP}
                placeholder={t("hist.select")} optLabel={optLabel} className={selectClass} />
            </div>
          </div>
        </Section>

        <Section title={t("hist.sec.review")}>
          <p className="text-xs text-slate-400 -mt-2">{t("hist.reviewHint")}</p>
          {HIST_REVIEW_SYSTEMS.map((sys) => (
            <ChipGroup key={sys.groupKey} label={optLabel(sys.groupKey)} options={sys.items}
              selected={data.reviewSystems} onToggle={(v) => toggleArray("reviewSystems", v)} optLabel={optLabel} />
          ))}
        </Section>

        <Section title={t("hist.sec.gyneco")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.menstrualDuration")}</label>
            <input type="number" className={inputClass} value={data.menstrualDuration} onChange={(e) => set("menstrualDuration", e.target.value)} />
          </div>
          <ChipGroup label={t("hist.menstrualCycle")} options={HIST_MENSTRUAL}
            selected={data.menstrualCycle} onToggle={(v) => toggleArray("menstrualCycle", v)} optLabel={optLabel} />
        </Section>

        <Section title={t("hist.sec.immuno")}>
          <ChipGroup label={t("hist.immuneSystem")} options={HIST_IMMUNOLOGY}
            selected={data.immunology} onToggle={(v) => toggleArray("immunology", v)} optLabel={optLabel} />
          <ChipGroup label={t("hist.whichVaccines")} options={HIST_VACCINES}
            selected={data.vaccines} onToggle={(v) => toggleArray("vaccines", v)} optLabel={optLabel} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.vaccineReactions")}</label>
            <input className={inputClass} value={data.vaccineReactions} onChange={(e) => set("vaccineReactions", e.target.value)} />
          </div>
        </Section>

        <Section title={t("hist.sec.substances")}>
          <ChipGroup label={t("hist.substancesQ")} options={HIST_SUBSTANCES}
            selected={data.substances} onToggle={(v) => toggleArray("substances", v)} optLabel={optLabel} />
        </Section>

        <Section title={t("hist.sec.infectious")}>
          <ChipGroup label={t("hist.infectiousQ")} options={HIST_INFECTIOUS}
            selected={data.infectious} onToggle={(v) => toggleArray("infectious", v)} optLabel={optLabel} />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("hist.otherInfectious")}</label>
            <input className={inputClass} value={data.otherInfectious} onChange={(e) => set("otherInfectious", e.target.value)} />
          </div>
        </Section>

        <Section title={t("hist.sec.notes")}>
          <textarea rows={3} className={textareaClass} value={data.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder={t("hist.notesPlaceholder")} />
        </Section>

        <div className="flex flex-wrap items-center gap-3 sticky bottom-4 bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-lg p-3">
          <button type="submit" disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? t("acct.saving") : t("hist.saveHistory")}
          </button>
          <button type="button" onClick={() => setShowShareModal(true)}
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            {shareLoading ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
            {t("hist.shareWithDoctor")}
          </button>
          <a href="/api/patient/history/pdf" target="_blank" rel="noopener noreferrer"
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            <Download size={16} /> {t("hist.exportPDF")}
          </a>
          <a href="/api/patient/history/fhir" target="_blank" rel="noopener noreferrer"
            className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2">
            <Download size={16} /> {t("hist.exportFHIR")}
          </a>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{t("hist.interopTitle")}</p>
            <p className="text-xs text-slate-500 mt-1">{t("hist.interopDesc")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/.well-known/smart-configuration" target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-emerald-700 bg-white border border-emerald-200 hover:border-emerald-300 px-4 py-2 rounded-xl transition">
              {t("hist.smartConfig")}
            </a>
            <a href="/fhir/metadata" target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-emerald-700 bg-white border border-emerald-200 hover:border-emerald-300 px-4 py-2 rounded-xl transition">
              {t("hist.fhirMetadata")}
            </a>
          </div>
        </div>

      </form>

      {showShareModal && (
        <ShareModal type="history" onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
