"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles, Mic, Square, Loader2, AlertCircle, FileText, X, CheckCircle2,
} from "lucide-react";
import { consultDraftKey } from "@/lib/ai-consult-notes";

type Lang = "pt" | "en" | "es";

const T: Record<string, Record<Lang, string>> = {
  title: {
    pt: "Assistente de notas",
    en: "Notes assistant",
    es: "Asistente de notas",
  },
  consent: {
    pt: "Confirmo que o paciente foi informado e consentiu com a grava??o de ?udio para aux?lio na documenta??o cl?nica.",
    en: "I confirm the patient was informed and consented to audio recording for clinical documentation assistance.",
    es: "Confirmo que el paciente fue informado y consinti? la grabaci?n de audio para ayuda en la documentaci?n cl?nica.",
  },
  start: { pt: "Iniciar grava??o", en: "Start recording", es: "Iniciar grabaci?n" },
  stop: { pt: "Parar e gerar resumo", en: "Stop and summarize", es: "Detener y resumir" },
  recording: { pt: "Gravando?", en: "Recording?", es: "Grabando?" },
  processing: { pt: "Processando ?udio e gerando resumo?", en: "Processing audio and generating summary?", es: "Procesando audio y generando resumen?" },
  transcript: { pt: "Transcri??o", en: "Transcript", es: "Transcripci?n" },
  summary: { pt: "Rascunho de evolu??o", en: "Evolution draft", es: "Borrador de evoluci?n" },
  createEvolution: {
    pt: "Criar evolu??o na ficha",
    en: "Create chart evolution",
    es: "Crear evoluci?n en la ficha",
  },
  regenerate: { pt: "Regenerar resumo", en: "Regenerate summary", es: "Regenerar resumen" },
  close: { pt: "Fechar", en: "Close", es: "Cerrar" },
  needConsent: {
    pt: "Marque o consentimento para iniciar.",
    en: "Check consent to start.",
    es: "Marque el consentimiento para iniciar.",
  },
  micError: {
    pt: "N?o foi poss?vel acessar o microfone.",
    en: "Could not access the microphone.",
    es: "No se pudo acceder al micr?fono.",
  },
  aiNotConfigured: {
    pt: "IA n?o configurada (ANTHROPIC_API_KEY).",
    en: "AI not configured (ANTHROPIC_API_KEY).",
    es: "IA no configurada (ANTHROPIC_API_KEY).",
  },
  transcribeNotConfigured: {
    pt: "Transcri??o n?o configurada (OPENAI_API_KEY). Voc? pode colar a transcri??o manualmente abaixo.",
    en: "Transcription not configured (OPENAI_API_KEY). You can paste the transcript manually below.",
    es: "Transcripci?n no configurada (OPENAI_API_KEY). Puede pegar la transcripci?n manualmente abajo.",
  },
  genericError: {
    pt: "N?o foi poss?vel gerar o resumo. Tente novamente.",
    en: "Could not generate summary. Please try again.",
    es: "No se pudo generar el resumen. Int?ntelo de nuevo.",
  },
  draftTitle: {
    pt: "Evolu??o ? teleconsulta",
    en: "Evolution ? teleconsult",
    es: "Evoluci?n ? teleconsulta",
  },
  pasteHint: {
    pt: "Ou cole a transcri??o / anota??es:",
    en: "Or paste transcript / notes:",
    es: "O pegue la transcripci?n / notas:",
  },
  summarizeText: {
    pt: "Gerar resumo do texto",
    en: "Generate summary from text",
    es: "Generar resumen del texto",
  },
  reviewHint: {
    pt: "Revise antes de salvar na ficha",
    en: "Review before saving to chart",
    es: "Revise antes de guardar en la ficha",
  },
};

type Props = {
  lang: Lang;
  patientRecordId: string | null;
  appointmentId?: string | null;
  patientName?: string;
};

export default function ConsultNotesAssistant({
  lang,
  patientRecordId,
  appointmentId,
}: Props) {
  const t = (k: string) => T[k]?.[lang] ?? T[k]?.["en"] ?? k;

  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [manualText, setManualText] = useState("");
  const [transcribeOk, setTranscribeOk] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/professional/ai-consult-notes")
      .then((r) => r.json())
      .then((d) => setTranscribeOk(!!d.transcribeConfigured))
      .catch(() => setTranscribeOk(false));
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setElapsed(0);
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, [stopTimer]);

  useEffect(() => () => {
    stopTimer();
    mediaRecorderRef.current?.stream.getTracks().forEach((tr) => tr.stop());
  }, [stopTimer]);

  async function processPayload(form: FormData | Record<string, unknown>) {
    setProcessing(true);
    setError("");
    try {
      const isForm = form instanceof FormData;
      const res = await fetch("/api/professional/ai-consult-notes", {
        method: "POST",
        ...(isForm ? { body: form } : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "AI_NOT_CONFIGURED") setError(t("aiNotConfigured"));
        else if (data.error === "TRANSCRIBE_NOT_CONFIGURED") setError(t("transcribeNotConfigured"));
        else if (data.error === "CONSENT_REQUIRED") setError(t("needConsent"));
        else setError(t("genericError"));
        return;
      }
      setTranscript(data.transcript || "");
      setSummary(data.summary || "");
      setShowResult(true);
    } catch {
      setError(t("genericError"));
    } finally {
      setProcessing(false);
    }
  }

  async function startRecording() {
    if (!consent) {
      setError(t("needConsent"));
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        stopTimer();
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size === 0) {
          setError(t("genericError"));
          return;
        }
        const form = new FormData();
        form.append("consent", "true");
        form.append("audio", blob, "consult.webm");
        form.append("lang", lang);
        if (patientRecordId) form.append("patientRecordId", patientRecordId);
        if (appointmentId) form.append("appointmentId", appointmentId);
        await processPayload(form);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      startTimer();
    } catch {
      setError(t("micError"));
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function summarizeManual() {
    if (!consent) {
      setError(t("needConsent"));
      return;
    }
    const text = manualText.trim();
    if (!text) return;
    await processPayload({
      consent: true,
      transcript: text,
      lang,
      patientRecordId: patientRecordId || undefined,
      appointmentId: appointmentId || undefined,
    });
  }

  async function regenerateSummary() {
    if (!transcript.trim()) return;
    await processPayload({
      consent: true,
      transcript: transcript.trim(),
      lang,
      patientRecordId: patientRecordId || undefined,
      appointmentId: appointmentId || undefined,
    });
  }

  function createEvolution() {
    if (!patientRecordId || !summary.trim()) return;
    sessionStorage.setItem(
      consultDraftKey(patientRecordId),
      JSON.stringify({
        title: t("draftTitle"),
        content: summary.trim(),
        recordKind: "EVOLUTION",
      }),
    );
    window.open(`/professional/patients/${patientRecordId}`, "_blank");
    setShowResult(false);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <>
      <div className="bg-slate-800 rounded-xl p-3 space-y-2 border border-violet-500/20">
        <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
          <Sparkles size={13} /> {t("title")}
        </p>

        <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer leading-snug">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 accent-violet-500 shrink-0"
          />
          {t("consent")}
        </label>

        {recording ? (
          <div className="space-y-2">
            <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {t("recording")} {mm}:{ss}
            </p>
            <button
              type="button"
              onClick={stopRecording}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 py-2 rounded-lg transition"
            >
              <Square size={12} /> {t("stop")}
            </button>
          </div>
        ) : processing ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5 py-2">
            <Loader2 size={13} className="animate-spin text-violet-400" />
            {t("processing")}
          </p>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={!consent || !transcribeOk}
            title={!transcribeOk ? t("transcribeNotConfigured") : undefined}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 py-2 rounded-lg transition"
          >
            <Mic size={13} /> {t("start")}
          </button>
        )}

        {!transcribeOk && !recording && !processing && (
          <div className="space-y-2 pt-1 border-t border-slate-700">
            <p className="text-[10px] text-amber-400/90">{t("transcribeNotConfigured")}</p>
            <p className="text-[10px] text-slate-500">{t("pasteHint")}</p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-slate-500 resize-none"
            />
            <button
              type="button"
              onClick={summarizeManual}
              disabled={!consent || !manualText.trim()}
              className="w-full text-xs font-semibold text-violet-300 hover:text-white border border-violet-500/40 py-1.5 rounded-lg disabled:opacity-40"
            >
              {t("summarizeText")}
            </button>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-rose-400 flex items-start gap-1">
            <AlertCircle size={12} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}
      </div>

      {showResult && (
        <div className="fixed inset-0 bg-black/60 z-[1200] flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-violet-400" />
                {t("summary")}
              </h3>
              <button type="button" onClick={() => setShowResult(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">{t("transcript")}</p>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 resize-none"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">{t("summary")}</p>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex flex-col gap-2 shrink-0">
              {patientRecordId && (
                <button
                  type="button"
                  onClick={createEvolution}
                  disabled={!summary.trim()}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 rounded-lg"
                >
                  <FileText size={13} /> {t("createEvolution")}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={regenerateSummary}
                  disabled={processing || !transcript.trim()}
                  className="flex-1 text-xs font-medium text-violet-300 border border-violet-500/40 py-2 rounded-lg disabled:opacity-40"
                >
                  {processing ? <Loader2 size={12} className="animate-spin mx-auto" /> : t("regenerate")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResult(false)}
                  className="flex-1 text-xs font-medium text-slate-400 border border-slate-700 py-2 rounded-lg"
                >
                  {t("close")}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 text-center flex items-center justify-center gap-1">
                <CheckCircle2 size={10} /> {t("reviewHint")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
