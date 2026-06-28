"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2, Circle, ChevronRight, X, Sparkles,
  User, Heart, Shield, Calendar, ClipboardList,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

type Lang = "pt" | "en" | "es";

interface ChecklistState {
  hasProfile: boolean;
  hasHistory: boolean;
  hasTcle: boolean;
  hasAppointment: boolean;
  hasDocument: boolean;
  hasClub: boolean;
}

const STORAGE_KEY = "doctor8.patient.checklist.dismissed";
const CACHE_KEY = "doctor8.patient.checklist.state";
const CACHE_TTL_MS = 5 * 60 * 1000;

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = localStorage.getItem("doctor8.lang");
    if (saved?.startsWith("en")) return "en";
    if (saved?.startsWith("es")) return "es";
  } catch { /* ignore */ }
  return "pt";
}

export default function PatientChecklist() {
  const t = useT();
  const [lang, setLang] = useState<Lang>("pt");
  const [state, setState] = useState<ChecklistState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLang(detectLang());
    if (localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
      setLoading(false);
      return;
    }
    loadState();
  }, []);

  async function loadState() {
    setLoadError(false);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS) {
          setState(data);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    try {
      const res = await fetch("/api/patient/onboarding-status");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-40 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-64" />
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm p-5 flex items-center gap-3">
        <AlertCircle size={18} className="text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">{t("pcheck.loadError")}</p>
        </div>
        <button
          type="button"
          onClick={() => { setLoading(true); loadState(); }}
          className="text-xs font-semibold text-amber-800 flex items-center gap-1 hover:underline shrink-0"
        >
          <RefreshCw size={13} /> {t("common.retry")}
        </button>
      </div>
    );
  }

  const items = [
    { id: "profile", icon: <User size={16} />, href: "/patient/account", done: state.hasProfile, label: t("pcheck.profile"), hint: t("pcheck.profileHint") },
    { id: "history", icon: <Heart size={16} />, href: "/patient/history", done: state.hasHistory, label: t("pcheck.history"), hint: t("pcheck.historyHint") },
    { id: "tcle", icon: <Shield size={16} />, href: "/patient/tcle", done: state.hasTcle, label: t("pcheck.tcle"), hint: t("pcheck.tcleHint") },
    { id: "appointment", icon: <Calendar size={16} />, href: "/patient/appointments", done: state.hasAppointment, label: t("pcheck.appointment"), hint: t("pcheck.appointmentHint") },
    { id: "document", icon: <ClipboardList size={16} />, href: "/patient/documents", done: state.hasDocument, label: t("pcheck.document"), hint: t("pcheck.documentHint") },
    { id: "club", icon: <Sparkles size={16} />, href: "/patient/club-doctor", done: state.hasClub, label: t("pcheck.club"), hint: t("pcheck.clubHint") },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${allDone ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className={allDone ? "text-emerald-500" : "text-amber-500"} />
            <h2 className="font-bold text-slate-900 text-sm">{t("pcheck.title")}</h2>
          </div>
          <p className="text-xs text-slate-500">{allDone ? t("pcheck.done") : t("pcheck.subtitle")}</p>
        </div>
        <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
          <X size={16} />
        </button>
      </div>

      {!allDone && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{doneCount}/{items.length} {t("pcheck.progress")}</span>
            <span className="text-xs font-semibold text-emerald-600">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className={`divide-y ${allDone ? "divide-emerald-100" : "divide-slate-100"}`}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.done ? "#" : item.href}
            onClick={item.done ? (e) => e.preventDefault() : undefined}
            className={`flex items-center gap-3 px-5 py-3 transition group ${
              item.done ? "opacity-60 cursor-default" : "hover:bg-slate-50 cursor-pointer"
            }`}
          >
            <div className="shrink-0">
              {item.done ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-300" />}
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              item.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition"
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "text-slate-500 line-through" : "text-slate-800"}`}>{item.label}</p>
              <p className="text-xs text-slate-400 truncate">{item.hint}</p>
            </div>
            {!item.done && <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 shrink-0 transition" />}
          </Link>
        ))}
      </div>

      {allDone && (
        <div className="px-5 py-4 text-center">
          <p className="text-2xl mb-1">??</p>
          <button type="button" onClick={dismiss} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            {t("pcheck.dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
