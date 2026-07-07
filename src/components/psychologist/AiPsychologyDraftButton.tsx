"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { SessionFormat } from "@/lib/psychology-templates";

interface AiPsychologyDraftButtonProps {
  format: SessionFormat;
  rawNotes: string;
  durationMins?: number;
  patientName?: string;
  onDraft: (fields: Record<string, string>) => void;
  disabled?: boolean;
}

export default function AiPsychologyDraftButton({
  format,
  rawNotes,
  durationMins,
  patientName,
  onDraft,
  disabled,
}: AiPsychologyDraftButtonProps) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [riskMsg, setRiskMsg] = useState("");

  async function handleDraft() {
    if (!rawNotes.trim() || rawNotes.trim().length < 10) {
      setError(t("psy.ai.needNotes"));
      return;
    }
    setLoading(true);
    setError("");
    setRiskMsg("");
    try {
      const res = await fetch("/api/professional/psychology/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          rawNotes,
          lang,
          durationMins,
          patientName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "AI_NOT_CONFIGURED") setError(t("rec.aiNotConfigured"));
        else setError(t("rec.aiError"));
        return;
      }
      onDraft(data.fields || {});
      if (data.risk?.level && data.risk.level !== "none") {
        const msg = lang === "en" ? data.risk.messageEn : lang === "es" ? data.risk.messageEs : data.risk.messagePt;
        setRiskMsg(msg);
      }
    } catch {
      setError(t("rec.aiError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDraft}
        disabled={loading || disabled}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? t("psy.ai.generating") : t("psy.ai.draftButton")}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {riskMsg && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {riskMsg}
        </p>
      )}
    </div>
  );
}
