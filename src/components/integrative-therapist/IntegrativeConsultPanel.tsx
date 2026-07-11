"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Leaf, Send, CheckCircle2, Loader2 } from "lucide-react";
import { translate } from "@/lib/i18n/translations";
import { useToast } from "@/components/ui/toast";
import { PICS_PRACTICES } from "@/lib/pics/practices";
import {
  type IntegrativeConsultContext,
  type IntegrativeVisitType,
  visitDurationMins,
} from "@/lib/integrative-consult-context";
import {
  hasStructuredTemplate,
  emptyStructuredValues,
  structuredValuesHaveContent,
  type StructuredValues,
} from "@/lib/pics/consult-templates";
import IntegrativeStructuredForm from "@/components/integrative-therapist/IntegrativeStructuredForm";
import IntegrativeReferenceLibrary from "@/components/integrative-therapist/IntegrativeReferenceLibrary";
import PatientOrientationHandout from "@/components/integrative-therapist/PatientOrientationHandout";
import {
  CONSULT_STEPS,
  CONSULT_STEP_LABEL_KEYS,
  CONSULT_STEP_SECTIONS,
  type ConsultStepId,
} from "@/lib/integrative-consult-steps";

type Lang = "pt" | "en" | "es";

type ConsultSessionMeta = {
  startedAt: number | null;
  pausedTotal: number;
  visitType: IntegrativeVisitType;
  practiceSlug: string;
  consultStep: ConsultStepId;
};

function sessionStorageKey(appointmentId?: string | null, clientId?: string) {
  return `it-consult-meta:${appointmentId || clientId || "unknown"}`;
}

function readSessionMeta(key: string): ConsultSessionMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ConsultSessionMeta;
  } catch {
    return null;
  }
}

function writeSessionMeta(key: string, meta: ConsultSessionMeta) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(meta));
  } catch {
    // ignore quota errors
  }
}

interface IntegrativeConsultPanelProps {
  lang: Lang;
  clientId: string;
  appointmentId?: string | null;
  initialContext?: IntegrativeConsultContext | null;
  dark?: boolean;
  onNoteSaved?: () => void;
  onPracticeChange?: (slug: string) => void;
  onVisitTypeChange?: (visitType: IntegrativeVisitType) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function practiceLabel(slug: string, lang: Lang): string {
  const p = PICS_PRACTICES.find((x) => x.slug === slug);
  if (!p) return slug;
  if (lang === "pt") return p.labelPt;
  if (lang === "en") return p.labelEn;
  return p.labelEs;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function IntegrativeConsultPanel({
  lang,
  clientId,
  appointmentId,
  initialContext,
  dark = false,
  onNoteSaved,
  onPracticeChange,
  onVisitTypeChange,
  onDirtyChange,
}: IntegrativeConsultPanelProps) {
  const t = (key: string) => translate(lang, key);
  const toast = useToast();
  const storageKey = sessionStorageKey(appointmentId, clientId);
  const metaHydrated = useRef(false);

  const [context, setContext] = useState<IntegrativeConsultContext | null>(initialContext ?? null);
  const [loading, setLoading] = useState(!initialContext);
  const [visitType, setVisitType] = useState<IntegrativeVisitType>("return");
  const [practiceSlug, setPracticeSlug] = useState("");
  const [structuredValues, setStructuredValues] = useState<StructuredValues>({});
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [consultStep, setConsultStep] = useState<ConsultStepId>("welcome");
  const [retentionElapsed, setRetentionElapsed] = useState(0);
  const [retentionRunning, setRetentionRunning] = useState(false);
  const retentionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPracticeRef = useRef<string | null>(null);

  const retentionTargetSecs = 25 * 60;

  const usesStructured = hasStructuredTemplate(practiceSlug);

  const targetMins = visitDurationMins(visitType);
  const targetSecs = targetMins * 60;
  const remaining = Math.max(0, targetSecs - elapsed);
  const isOvertime = elapsed > targetSecs;
  const isWarning = !isOvertime && remaining <= 5 * 60 && remaining > 0;

  const onPracticeChangeRef = useRef(onPracticeChange);
  const onVisitTypeChangeRef = useRef(onVisitTypeChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  onPracticeChangeRef.current = onPracticeChange;
  onVisitTypeChangeRef.current = onVisitTypeChange;
  onDirtyChangeRef.current = onDirtyChange;

  const timerRunning = timerStartedAt !== null;

  const persistMeta = useCallback(
    (overrides: Partial<ConsultSessionMeta> = {}) => {
      writeSessionMeta(storageKey, {
        startedAt: overrides.startedAt !== undefined ? overrides.startedAt : timerStartedAt,
        pausedTotal: overrides.pausedTotal !== undefined ? overrides.pausedTotal : pausedTotal,
        visitType: overrides.visitType ?? visitType,
        practiceSlug: overrides.practiceSlug ?? practiceSlug,
        consultStep: overrides.consultStep ?? consultStep,
      });
    },
    [storageKey, timerStartedAt, pausedTotal, visitType, practiceSlug, consultStep],
  );

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (appointmentId) sp.set("appointmentId", appointmentId);
      else sp.set("clientId", clientId);
      const res = await fetch(`/api/integrative-therapist/consult-context?${sp}`);
      const d = await res.json();
      if (res.ok && d.context) {
        setContext(d.context);
        const saved = readSessionMeta(storageKey);
        if (!saved) {
          setVisitType(d.context.defaultVisitType);
          const defaultPractice = d.context.mainPractice || d.context.picsPractices?.[0] || "";
          setPracticeSlug(defaultPractice);
          onPracticeChangeRef.current?.(defaultPractice);
          onVisitTypeChangeRef.current?.(d.context.defaultVisitType);
        }
      } else {
        toast.error(typeof d.error === "string" ? d.error : t("it.err.loadConsult"));
      }
    } catch {
      toast.error(t("it.err.loadConsult"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, clientId, t, toast, storageKey]);

  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
      const saved = readSessionMeta(storageKey);
      if (!saved) {
        setVisitType(initialContext.defaultVisitType);
        const defaultPractice = initialContext.mainPractice || initialContext.picsPractices?.[0] || "";
        setPracticeSlug(defaultPractice);
        onPracticeChangeRef.current?.(defaultPractice);
      }
      setLoading(false);
      return;
    }
    void loadContext();
  }, [initialContext, loadContext, storageKey]);

  useEffect(() => {
    if (prevPracticeRef.current !== null && prevPracticeRef.current !== practiceSlug) {
      if (hasStructuredTemplate(practiceSlug)) {
        setStructuredValues(emptyStructuredValues(practiceSlug));
        setConsultStep("welcome");
        persistMeta({ consultStep: "welcome", practiceSlug });
      }
    }
    prevPracticeRef.current = practiceSlug;
  }, [practiceSlug, persistMeta]);

  useEffect(() => {
    if (metaHydrated.current) return;
    const saved = readSessionMeta(storageKey);
    if (saved) {
      setVisitType(saved.visitType);
      setPracticeSlug(saved.practiceSlug);
      setConsultStep(saved.consultStep);
      setPausedTotal(saved.pausedTotal);
      setTimerStartedAt(saved.startedAt);
      setElapsed(
        saved.startedAt
          ? saved.pausedTotal + Math.floor((Date.now() - saved.startedAt) / 1000)
          : saved.pausedTotal,
      );
      onPracticeChangeRef.current?.(saved.practiceSlug);
      onVisitTypeChangeRef.current?.(saved.visitType);
    }
    metaHydrated.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!metaHydrated.current) return;
    persistMeta();
  }, [timerStartedAt, pausedTotal, visitType, practiceSlug, consultStep, persistMeta]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setElapsed(pausedTotal + Math.floor((Date.now() - (timerStartedAt ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerStartedAt, pausedTotal]);

  const isDirty = usesStructured
    ? structuredValuesHaveContent(structuredValues)
    : noteText.trim().length > 0;

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!retentionRunning) {
      if (retentionRef.current) clearInterval(retentionRef.current);
      return;
    }
    retentionRef.current = setInterval(() => setRetentionElapsed((s) => s + 1), 1000);
    return () => {
      if (retentionRef.current) clearInterval(retentionRef.current);
    };
  }, [retentionRunning]);

  useEffect(() => {
    if (practiceSlug !== "acupuntura") {
      setRetentionRunning(false);
      setRetentionElapsed(0);
    }
  }, [practiceSlug]);

  function stepIndex(step: ConsultStepId) {
    return CONSULT_STEPS.indexOf(step);
  }

  function goNextStep() {
    const i = stepIndex(consultStep);
    if (i < CONSULT_STEPS.length - 1) {
      const next = CONSULT_STEPS[i + 1];
      setConsultStep(next);
      persistMeta({ consultStep: next });
    }
  }

  function goPrevStep() {
    const i = stepIndex(consultStep);
    if (i > 0) {
      const prev = CONSULT_STEPS[i - 1];
      setConsultStep(prev);
      persistMeta({ consultStep: prev });
    }
  }

  function toggleRetention() {
    if (retentionRunning) {
      setRetentionRunning(false);
    } else {
      setRetentionElapsed(0);
      setRetentionRunning(true);
    }
  }

  const retentionRemaining = Math.max(0, retentionTargetSecs - retentionElapsed);
  const retentionOvertime = retentionElapsed > retentionTargetSecs;

  function handleVisitType(next: IntegrativeVisitType) {
    setVisitType(next);
    onVisitTypeChange?.(next);
    persistMeta({ visitType: next });
  }

  function handlePractice(slug: string) {
    setPracticeSlug(slug);
    onPracticeChange?.(slug);
    persistMeta({ practiceSlug: slug });
  }

  function toggleTimer() {
    if (timerRunning) {
      const nextPaused = pausedTotal + Math.floor((Date.now() - (timerStartedAt ?? Date.now())) / 1000);
      setPausedTotal(nextPaused);
      setElapsed(nextPaused);
      setTimerStartedAt(null);
      persistMeta({ startedAt: null, pausedTotal: nextPaused });
    } else {
      const now = Date.now();
      setTimerStartedAt(now);
      persistMeta({ startedAt: now });
    }
  }

  const canSave = usesStructured
    ? structuredValuesHaveContent(structuredValues)
    : noteText.trim().length > 0;

  async function saveNote() {
    if (!canSave || !clientId) return;
    setNoteSaving(true);
    try {
      const payload: Record<string, unknown> = {
        integrativeClientRecordId: clientId,
        practiceSlug: practiceSlug || undefined,
        appointmentId: appointmentId || undefined,
        visitType,
        lang,
      };
      if (usesStructured) {
        payload.structured = structuredValues;
      } else {
        payload.content = noteText.trim();
      }

      const res = await fetch("/api/integrative-therapist/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (usesStructured) {
          setStructuredValues(emptyStructuredValues(practiceSlug));
        } else {
          setNoteText("");
        }
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2500);
        onNoteSaved?.();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === "string" ? d.error : t("it.err.saveNote"));
      }
    } catch {
      toast.error(t("it.err.saveNote"));
    } finally {
      setNoteSaving(false);
    }
  }

  const card = dark
    ? "bg-slate-800 rounded-xl p-3 space-y-3"
    : "bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm";
  const label = dark ? "text-xs font-semibold text-slate-300" : "text-xs font-medium text-slate-600";
  const input = dark
    ? "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
    : "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";
  const textarea = `${input} resize-none min-h-[88px]`;
  const muted = dark ? "text-slate-500" : "text-slate-400";
  const chipBase = "text-[10px] font-bold px-2.5 py-1 rounded-full transition";
  const chipActive = dark
    ? "bg-teal-500/25 text-teal-300 border border-teal-500/40"
    : "bg-teal-100 text-teal-800 border border-teal-200";
  const chipIdle = dark
    ? "bg-slate-700 text-slate-400 border border-slate-600 hover:text-slate-200"
    : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100";

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className={`animate-spin ${dark ? "text-slate-500" : "text-slate-400"}`} size={20} />
      </div>
    );
  }

  const practices = context?.picsPractices?.length
    ? context.picsPractices
    : PICS_PRACTICES.map((p) => p.slug);

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className={`${label} flex items-center gap-1.5`}>
          <Clock size={13} className="text-teal-500" />
          {t("it.consult.timer")}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleVisitType("first")}
            className={`${chipBase} ${visitType === "first" ? chipActive : chipIdle}`}
          >
            {t("it.consult.firstVisit")} (60m)
          </button>
          <button
            type="button"
            onClick={() => handleVisitType("return")}
            className={`${chipBase} ${visitType === "return" ? chipActive : chipIdle}`}
          >
            {t("it.consult.returnVisit")} (30m)
          </button>
        <button
          type="button"
          onClick={toggleTimer}
          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${
            timerRunning
              ? "bg-amber-500/20 text-amber-700 border border-amber-300"
              : "bg-teal-600 text-white"
          }`}
        >
          {timerRunning ? t("it.consult.timerPause") : t("it.consult.timerStart")}
        </button>
        </div>
      </div>

      <div
        className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
          isOvertime
            ? "bg-red-500/15 border border-red-500/30"
            : isWarning
              ? "bg-amber-500/15 border border-amber-500/30"
              : dark
                ? "bg-slate-700/60 border border-slate-600"
                : "bg-slate-50 border border-slate-100"
        }`}
      >
        <div>
          <p className={`text-lg font-bold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>
            {formatElapsed(elapsed)}
          </p>
          <p className={`text-[10px] ${muted}`}>{t("it.consult.elapsed")}</p>
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-semibold tabular-nums ${
              isOvertime ? "text-red-400" : isWarning ? "text-amber-400" : dark ? "text-teal-300" : "text-teal-700"
            }`}
          >
            {isOvertime ? `+${formatElapsed(elapsed - targetSecs)}` : formatElapsed(remaining)}
          </p>
          <p className={`text-[10px] ${muted}`}>
            {isOvertime ? t("it.consult.overtime") : t("it.consult.remaining")}
          </p>
        </div>
      </div>

      {context?.chiefComplaint && (
        <div className={dark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
          <span className="font-semibold">{t("it.clients.chiefComplaint")}: </span>
          {context.chiefComplaint}
        </div>
      )}

      <div>
        <label className={`${label} flex items-center gap-1.5 mb-1.5`}>
          <Leaf size={12} className="text-teal-500" />
          {t("it.sessions.practiceUsed")}
        </label>
        <select
          className={input}
          value={practiceSlug}
          onChange={(e) => handlePractice(e.target.value)}
        >
          <option value="">{t("it.clients.selectPractice")}</option>
          {practices.map((slug) => (
            <option key={slug} value={slug}>
              {practiceLabel(slug, lang)}
            </option>
          ))}
        </select>
      </div>

      {practiceSlug && (
        <IntegrativeReferenceLibrary lang={lang} practiceSlug={practiceSlug} dark={dark} />
      )}

      {practiceSlug === "acupuntura" && (
        <div className={dark ? "rounded-xl border border-slate-600 bg-slate-700/50 p-3 space-y-2" : "rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2"}>
          <p className={`${label} flex items-center gap-1.5`}>
            <Clock size={12} className="text-teal-500" />
            {t("it.consult.acu.retention")}
          </p>
          <p className={`text-[10px] ${muted}`}>{t("it.consult.acu.retentionHint")}</p>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-bold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>
              {formatElapsed(retentionElapsed)}
              <span className={`text-[10px] font-normal ml-2 ${muted}`}>
                {retentionOvertime ? t("it.consult.overtime") : formatElapsed(retentionRemaining)}
              </span>
            </p>
            <button
              type="button"
              onClick={toggleRetention}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${
                retentionRunning
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-teal-600 text-white"
              }`}
            >
              {retentionRunning ? t("it.consult.acu.stopRetention") : t("it.consult.acu.startRetention")}
            </button>
          </div>
        </div>
      )}

      {usesStructured && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CONSULT_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => {
                setConsultStep(step);
                persistMeta({ consultStep: step });
              }}
              className={`${chipBase} shrink-0 ${consultStep === step ? chipActive : chipIdle}`}
            >
              {t(CONSULT_STEP_LABEL_KEYS[step])}
            </button>
          ))}
        </div>
      )}

      {usesStructured && consultStep === "welcome" && context && (
        <div className={`text-xs space-y-2 ${dark ? "text-slate-300" : "text-slate-600"}`}>
          <p>{t("it.consult.welcome.hint")}</p>
          <p>
            <span className="font-semibold">{t("it.consult.welcome.sessions")}: </span>
            {context.priorSessionCount}
          </p>
          {context.treatmentGoals && (
            <p>
              <span className="font-semibold">{t("it.consult.welcome.goals")}: </span>
              {context.treatmentGoals}
            </p>
          )}
        </div>
      )}

      {usesStructured && consultStep !== "welcome" && consultStep !== "close" ? (
        <IntegrativeStructuredForm
          lang={lang}
          practiceSlug={practiceSlug}
          values={structuredValues}
          onChange={setStructuredValues}
          dark={dark}
          sectionKeys={CONSULT_STEP_SECTIONS[consultStep]}
        />
      ) : usesStructured && consultStep === "close" ? (
        <>
          <IntegrativeStructuredForm
            lang={lang}
            practiceSlug={practiceSlug}
            values={structuredValues}
            onChange={setStructuredValues}
            dark={dark}
            sectionKeys={CONSULT_STEP_SECTIONS.close}
          />
          {context && (
            <PatientOrientationHandout
              lang={lang}
              practiceSlug={practiceSlug}
              structuredValues={structuredValues}
              visitType={visitType}
              clientName={`${context.clientFirstName} ${context.clientLastName}`.trim()}
              dark={dark}
            />
          )}
        </>
      ) : !usesStructured ? (
        <div>
          <label className={`${label} mb-1.5 block`}>{t("it.sessions.note")}</label>
          <textarea
            className={textarea}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t("it.sessions.placeholder")}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) void saveNote();
            }}
          />
        </div>
      ) : null}

      {usesStructured && consultStep !== "close" && (
        <div className="flex gap-2">
          {stepIndex(consultStep) > 0 && (
            <button
              type="button"
              onClick={goPrevStep}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg border ${
                dark ? "border-slate-600 text-slate-300" : "border-slate-200 text-slate-600"
              }`}
            >
              {t("it.consult.step.prev")}
            </button>
          )}
          <button
            type="button"
            onClick={goNextStep}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg ${
              dark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-800"
            }`}
          >
            {t("it.consult.step.next")}
          </button>
        </div>
      )}

      {(consultStep === "close" || !usesStructured) && (
      <button
        type="button"
        onClick={() => void saveNote()}
        disabled={!canSave || noteSaving}
        className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition disabled:opacity-40 ${
          dark
            ? "text-white bg-teal-600 hover:bg-teal-500"
            : "text-white bg-teal-600 hover:bg-teal-700"
        }`}
      >
        {noteSaved ? (
          <>
            <CheckCircle2 size={13} /> {t("it.consult.saved")}
          </>
        ) : noteSaving ? (
          <>
            <Loader2 size={13} className="animate-spin" /> {t("it.consult.saving")}
          </>
        ) : (
          <>
            <Send size={13} /> {t("it.sessions.save")}
          </>
        )}
      </button>
      )}
    </div>
  );
}
