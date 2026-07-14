"use client";

import { useEffect } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import type { Lang } from "@/lib/i18n/translations";
import { useVoiceDictation, type VoiceDictationLabels } from "@/hooks/useVoiceDictation";

type Props = {
  lang: Lang;
  onText: (text: string) => void;
  getCurrentText: () => string;
  maxLength?: number;
  disabled?: boolean;
  labels: VoiceDictationLabels & {
    start: string;
    stop: string;
    listening: string;
  };
  onError?: (message: string) => void;
  className?: string;
};

export default function DictationMicButton({
  lang,
  onText,
  getCurrentText,
  maxLength,
  disabled = false,
  labels,
  onError,
  className = "",
}: Props) {
  const { supported, recording, processing, error, toggle } = useVoiceDictation({
    lang,
    onText,
    getCurrentText,
    maxLength,
    labels,
    disabled,
  });

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  if (!supported) return null;

  const title = processing
    ? labels.transcribing
    : recording
      ? labels.stop
      : labels.start;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || processing}
      aria-pressed={recording}
      aria-label={title}
      title={recording ? labels.listening : title}
      className={`inline-flex items-center justify-center rounded-xl transition min-h-[40px] min-w-[40px] ${className} ${
        recording
          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm animate-pulse"
          : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
      } disabled:opacity-50`}
    >
      {processing ? (
        <Loader2 size={18} className="animate-spin" />
      ) : recording ? (
        <Square size={16} fill="currentColor" />
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
}
