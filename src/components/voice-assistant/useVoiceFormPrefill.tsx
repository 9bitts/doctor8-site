"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { consumeVoiceFormPrefill } from "@/lib/voice-assistant/prefill-storage";
import type { VoiceFormType } from "@/lib/voice-assistant/types";

type Props = {
  formType: VoiceFormType;
  chartId?: string;
  onApply: (data: Record<string, unknown>) => void;
};

export function useVoiceFormPrefill({ formType, chartId, onApply }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!chartId) return;
    const payload = consumeVoiceFormPrefill(formType, chartId);
    if (!payload) return;
    onApply(payload.data as Record<string, unknown>);
    setActive(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType, chartId]);

  return { voicePrefillActive: active };
}

export function VoicePrefillBanner({ active }: { active: boolean }) {
  const { lang } = useI18n();
  if (!active) return null;

  const title =
    lang === "es"
      ? "Completado por asistente de voz"
      : lang === "en"
        ? "Prefilled by voice assistant"
        : "Preenchido pelo assistente de voz";

  const hint =
    lang === "es"
      ? "Revise todos los campos antes de guardar."
      : lang === "en"
        ? "Review all fields before saving."
        : "Confira todos os campos antes de salvar.";

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
      <Sparkles size={18} className="text-violet-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-violet-800">{title}</p>
        <p className="text-xs text-violet-700 mt-1">{hint}</p>
      </div>
    </div>
  );
}
