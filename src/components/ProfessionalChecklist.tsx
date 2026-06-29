"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2, Circle, ChevronRight, X, Sparkles,
  User, Calendar, Users, Pill, Radio, BookOpen, PenLine,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { mapProfessionalPathToPortal, professionalPortalBase } from "@/lib/psychologist-portal";

type Lang = "pt" | "en" | "es";

interface ChecklistState {
  hasProfile: boolean;
  hasAvailability: boolean;
  hasPatient: boolean;
  hasPrescription: boolean;
  hasJit: boolean;
  hasResource: boolean;
  hasDigitalSign: boolean;
}

const T: Record<string, Record<Lang, string>> = {
  title:       { pt: "Primeiros passos",           en: "Getting started",            es: "Primeros pasos" },
  subtitle:    { pt: "Complete sua conta para começar a atender pacientes.",
                 en: "Complete your account to start seeing patients.",
                 es: "Completa tu cuenta para comenzar a atender pacientes." },
  done:        { pt: "Tudo pronto! Você está configurado para atender.",
                 en: "All done! You're all set to see patients.",
                 es: "¡Todo listo! Estás listo para atender pacientes." },
  dismiss:     { pt: "Fechar",                     en: "Dismiss",                    es: "Cerrar" },
  loadError:   { pt: "Não foi possível carregar o checklist.", en: "Could not load checklist.", es: "No se pudo cargar la lista." },
  retry:       { pt: "Tentar novamente",           en: "Try again",                  es: "Reintentar" },
  profile:     { pt: "Complete seu perfil",        en: "Complete your profile",       es: "Completa tu perfil" },
  availability:{ pt: "Configure sua disponibilidade", en: "Set your availability",   es: "Configura tu disponibilidad" },
  patient:     { pt: "Crie sua primeira ficha",    en: "Create your first chart",     es: "Crea tu primera ficha" },
  prescription:{ pt: "Emita sua primeira receita", en: "Issue your first prescription", es: "Emite tu primera receta" },
  digSign:     { pt: "Configure assinatura ICP-Brasil", en: "Set up ICP-Brasil signature", es: "Configura firma ICP-Brasil" },
  jit:         { pt: "Ative o Plantão Online",     en: "Activate Online Duty",        es: "Activa la Guardia Online" },
  resource:    { pt: "Adicione um recurso à Biblioteca", en: "Add a resource to the Library", es: "Agrega un recurso a la Biblioteca" },
  profileHint: { pt: "Foto, especialidade, CRM e bio",
                 en: "Photo, specialty, license and bio",
                 es: "Foto, especialidad, licencia y bio" },
  availHint:   { pt: "Defina dias e horários de atendimento",
                 en: "Set your working days and times",
                 es: "Define tus días y horarios de atención" },
  patientHint: { pt: "Cadastre um paciente para começar",
                 en: "Register a patient to get started",
                 es: "Registra un paciente para comenzar" },
  rxHint:      { pt: "Prescreva com base de dados Anvisa",
                 en: "Prescribe using the Anvisa drug database",
                 es: "Prescribe usando la base de datos Anvisa" },
  digSignHint: { pt: "CPF do certificado BirdID ou VIDaaS",
                 en: "CPF linked to your BirdID or VIDaaS certificate",
                 es: "CPF del certificado BirdID o VIDaaS" },
  jitHint:     { pt: "Atenda pacientes sem agendamento prévio",
                 en: "See patients without prior scheduling",
                 es: "Atiende pacientes sin cita previa" },
  resourceHint:{ pt: "Compartilhe links e arquivos com pacientes",
                 en: "Share links and files with patients",
                 es: "Comparte enlaces y archivos con pacientes" },
  progress:    { pt: "concluído",                  en: "complete",                   es: "completado" },
};

const STORAGE_KEY  = "doctor8.checklist.dismissed";
const CACHE_KEY    = "doctor8.checklist.state";
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

export default function ProfessionalChecklist() {
  const pathname = usePathname();
  const psychologyPortal = professionalPortalBase(pathname) === "/psychologist";
  const mapPath = (path: string) => mapProfessionalPathToPortal(pathname, path);
  const [lang, setLang] = useState<Lang>("pt");
  const [state, setState] = useState<ChecklistState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const t = (k: string) => T[k]?.[lang] ?? T[k]?.["en"] ?? k;

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
      const res = await fetch("/api/professional/onboarding-status");
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
        <p className="text-sm font-semibold text-amber-900 flex-1">{t("loadError")}</p>
        <button type="button" onClick={() => { setLoading(true); loadState(); }}
          className="text-xs font-semibold text-amber-800 flex items-center gap-1 hover:underline shrink-0">
          <RefreshCw size={13} /> {t("retry")}
        </button>
      </div>
    );
  }

  const items = [
    { id: "profile", icon: <User size={16} />, href: mapPath("/professional/account"), done: state.hasProfile, label: t("profile"), hint: t("profileHint") },
    { id: "availability", icon: <Calendar size={16} />, href: mapPath("/professional/settings/availability"), done: state.hasAvailability, label: t("availability"), hint: t("availHint") },
    ...(!psychologyPortal
      ? [{ id: "digSign", icon: <PenLine size={16} />, href: mapPath("/professional/account#digital-sign"), done: state.hasDigitalSign, label: t("digSign"), hint: t("digSignHint") }]
      : []),
    { id: "patient", icon: <Users size={16} />, href: mapPath("/professional/patients"), done: state.hasPatient, label: t("patient"), hint: t("patientHint") },
    ...(!psychologyPortal
      ? [{ id: "prescription", icon: <Pill size={16} />, href: mapPath("/professional/prescriptions"), done: state.hasPrescription, label: t("prescription"), hint: t("rxHint") }]
      : []),
    { id: "jit", icon: <Radio size={16} />, href: mapPath("/professional/jit"), done: state.hasJit, label: t("jit"), hint: t("jitHint") },
    { id: "resource", icon: <BookOpen size={16} />, href: mapPath("/professional/resources"), done: state.hasResource, label: t("resource"), hint: t("resourceHint") },
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
            <h2 className="font-bold text-slate-900 text-sm">{t("title")}</h2>
          </div>
          <p className="text-xs text-slate-500">{allDone ? t("done") : t("subtitle")}</p>
        </div>
        <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
          <X size={16} />
        </button>
      </div>

      {!allDone && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{doneCount}/{items.length} {t("progress")}</span>
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
            {t("dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
