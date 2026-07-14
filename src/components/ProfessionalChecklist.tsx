"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2, Circle, ChevronRight, X, Sparkles,
  User, Calendar, Users, Pill, Radio, BookOpen, PenLine,
  AlertCircle, RefreshCw, CreditCard, Sprout,
} from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal, professionalPortalBase } from "@/lib/psychologist-portal";
import { PROFESSIONAL_INTEGRATIVE_HUB } from "@/lib/integrative-medicine/professional-routes";

interface ChecklistState {
  hasProfile: boolean;
  hasAvailability: boolean;
  hasPatient: boolean;
  hasPrescription: boolean;
  hasJit: boolean;
  hasResource: boolean;
  hasDigitalSign: boolean;
  stripeConnectEnabled?: boolean;
  hasStripeConnect?: boolean;
  hasExploredIntegrative?: boolean;
  hasIntegrativeRx?: boolean;
}

const DISMISS_KEY_PREFIX = "doctor8.pro.checklist.dismissed";
const CACHE_KEY_PREFIX = "doctor8.pro.checklist.state";
const LEGACY_DISMISS_KEY = "doctor8.checklist.dismissed";
const LEGACY_CACHE_KEY = "doctor8.checklist.state";
const CACHE_TTL_MS = 5 * 60 * 1000;

function dismissKeyForUser(userId: string): string {
  return `${DISMISS_KEY_PREFIX}.${userId}`;
}

function cacheKeyForUser(userId: string): string {
  return `${CACHE_KEY_PREFIX}.${userId}`;
}

export default function ProfessionalChecklist() {
  const t = useT();
  const pathname = usePathname();
  const psychologyPortal = professionalPortalBase(pathname) === "/psychologist";
  const mapPath = (path: string) => mapProfessionalPathToPortal(pathname, path);
  const [state, setState] = useState<ChecklistState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const id = s?.user?.id as string | undefined;
        if (!id) {
          setLoading(false);
          return;
        }
        setUserId(id);
        if (localStorage.getItem(dismissKeyForUser(id)) || localStorage.getItem(LEGACY_DISMISS_KEY)) {
          setDismissed(true);
          setLoading(false);
          return;
        }
        loadState(id);
      })
      .catch(() => setLoadError(true));
  }, []);

  async function loadState(uid: string) {
    setLoadError(false);
    try {
      const cached = localStorage.getItem(cacheKeyForUser(uid)) ?? localStorage.getItem(LEGACY_CACHE_KEY);
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
      const res = await fetch("/api/professional/onboarding-status");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        localStorage.setItem(cacheKeyForUser(uid), JSON.stringify({ data, ts: Date.now() }));
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }

  function dismiss() {
    if (!userId) return;
    localStorage.setItem(dismissKeyForUser(userId), "1");
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
        <p className="text-sm font-semibold text-amber-900 flex-1">{t("procheck.loadError")}</p>
        <button
          type="button"
          onClick={() => { if (userId) { setLoading(true); void loadState(userId); } }}
          className="text-xs font-semibold text-amber-800 flex items-center gap-1 hover:underline shrink-0"
        >
          <RefreshCw size={13} /> {t("common.retry")}
        </button>
      </div>
    );
  }

  const items = [
    { id: "profile", icon: <User size={16} />, href: mapPath("/professional/settings"), done: state.hasProfile, label: t("procheck.profile"), hint: t("procheck.profileHint") },
    { id: "availability", icon: <Calendar size={16} />, href: mapPath("/professional/settings/availability"), done: state.hasAvailability, label: t("procheck.availability"), hint: t("procheck.availHint") },
    ...(!psychologyPortal
      ? [{ id: "digSign", icon: <PenLine size={16} />, href: mapPath("/professional/settings#section-digital-sign"), done: state.hasDigitalSign, label: t("procheck.digSign"), hint: t("procheck.digSignHint") }]
      : []),
    { id: "patient", icon: <Users size={16} />, href: mapPath("/professional/patients"), done: state.hasPatient, label: t("procheck.patient"), hint: t("procheck.patientHint") },
    ...(!psychologyPortal
      ? [{ id: "prescription", icon: <Pill size={16} />, href: mapPath("/professional/prescriptions"), done: state.hasPrescription, label: t("procheck.prescription"), hint: t("procheck.rxHint") }]
      : []),
    ...(!psychologyPortal
      ? [{
          id: "integrative",
          icon: <Sprout size={16} />,
          href: mapPath(PROFESSIONAL_INTEGRATIVE_HUB),
          done: !!state.hasExploredIntegrative,
          label: t("procheck.integrative"),
          hint: t("procheck.integrativeHint"),
        }]
      : []),
    { id: "jit", icon: <Radio size={16} />, href: mapPath("/professional/jit"), done: state.hasJit, label: t("procheck.jit"), hint: t("procheck.jitHint") },
    { id: "resource", icon: <BookOpen size={16} />, href: mapPath("/professional/resources"), done: state.hasResource, label: t("procheck.resource"), hint: t("procheck.resourceHint") },
    ...(state.stripeConnectEnabled
      ? [{
          id: "stripeConnect",
          icon: <CreditCard size={16} />,
          href: mapPath("/professional/financeiro"),
          done: !!state.hasStripeConnect,
          label: t("procheck.stripeConnect"),
          hint: t("procheck.stripeConnectHint"),
        }]
      : []),
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${allDone ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className={allDone ? "text-brand-500" : "text-amber-500"} />
            <h2 className="font-bold text-slate-900 text-sm">{t("procheck.title")}</h2>
          </div>
          <p className="text-xs text-slate-500">{allDone ? t("procheck.done") : t("procheck.subtitle")}</p>
        </div>
        <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
          <X size={16} />
        </button>
      </div>

      {!allDone && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{doneCount}/{items.length} {t("procheck.progress")}</span>
            <span className="text-xs font-semibold text-brand-500">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className={`divide-y ${allDone ? "divide-brand-100" : "divide-slate-100"}`}>
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
              {item.done ? <CheckCircle2 size={20} className="text-brand-500" /> : <Circle size={20} className="text-slate-300" />}
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              item.done ? "bg-brand-100 text-brand-500" : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-500 transition"
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "text-slate-500 line-through" : "text-slate-800"}`}>{item.label}</p>
              <p className="text-xs text-slate-400 truncate">{item.hint}</p>
            </div>
            {!item.done && <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 shrink-0 transition" />}
          </Link>
        ))}
      </div>

      {allDone && (
        <div className="px-5 py-4 text-center">
          <p className="text-2xl mb-1">🎉</p>
          <button type="button" onClick={dismiss} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
            {t("procheck.dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
