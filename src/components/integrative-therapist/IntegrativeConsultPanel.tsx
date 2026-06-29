"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Leaf, Send, CheckCircle2, Loader2 } from "lucide-react";
import { translate } from "@/lib/i18n/translations";
import { PICS_PRACTICES } from "@/lib/pics/practices";
import {
  type IntegrativeConsultContext,
  type IntegrativeVisitType,
  visitDurationMins,
} from "@/lib/integrative-consult-context";

type Lang = "pt" | "en" | "es";

interface IntegrativeConsultPanelProps {
  lang: Lang;
  clientId: string;
  appointmentId?: string | null;
  initialContext?: IntegrativeConsultContext | null;
  dark?: boolean;
  onNoteSaved?: () => void;
  onPracticeChange?: (slug: string) => void;
  onVisitTypeChange?: (visitType: IntegrativeVisitType) => void;
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
}: IntegrativeConsultPanelProps) {
  const t = (key: string) => translate(lang, key);

  const [context, setContext] = useState<IntegrativeConsultContext | null>(initialContext ?? null);
  const [loading, setLoading] = useState(!initialContext);
  const [visitType, setVisitType] = useState<IntegrativeVisitType>("return");
  const [practiceSlug, setPracticeSlug] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetMins = visitDurationMins(visitType);
  const targetSecs = targetMins * 60;
  const remaining = Math.max(0, targetSecs - elapsed);
  const isOvertime = elapsed > targetSecs;
  const isWarning = !isOvertime && remaining <= 5 * 60 && remaining > 0;

  const onPracticeChangeRef = useRef(onPracticeChange);
  const onVisitTypeChangeRef = useRef(onVisitTypeChange);
  onPracticeChangeRef.current = onPracticeChange;
  onVisitTypeChangeRef.current = onVisitTypeChange;

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
        setVisitType(d.context.defaultVisitType);
        const defaultPractice = d.context.mainPractice || d.context.picsPractices?.[0] || "";
        setPracticeSlug(defaultPractice);
        onPracticeChangeRef.current?.(defaultPractice);
        onVisitTypeChangeRef.current?.(d.context.defaultVisitType);
      }
    } finally {
      setLoading(false);
    }
  }, [appointmentId, clientId]);

  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
      setVisitType(initialContext.defaultVisitType);
      const defaultPractice = initialContext.mainPractice || initialContext.picsPractices?.[0] || "";
      setPracticeSlug(defaultPractice);
      onPracticeChangeRef.current?.(defaultPractice);
      setLoading(false);
      return;
    }
    void loadContext();
  }, [initialContext, loadContext]);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleVisitType(next: IntegrativeVisitType) {
    setVisitType(next);
    onVisitTypeChange?.(next);
  }

  function handlePractice(slug: string) {
    setPracticeSlug(slug);
    onPracticeChange?.(slug);
  }

  async function saveNote() {
    if (!noteText.trim() || !clientId) return;
    setNoteSaving(true);
    try {
      const res = await fetch("/api/integrative-therapist/session-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrativeClientRecordId: clientId,
          content: noteText.trim(),
          practiceSlug: practiceSlug || undefined,
          appointmentId: appointmentId || undefined,
        }),
      });
      if (res.ok) {
        setNoteText("");
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2500);
        onNoteSaved?.();
      }
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
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={!noteText.trim() || noteSaving}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition disabled:opacity-40 ${
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
      </div>
    </div>
  );
}
