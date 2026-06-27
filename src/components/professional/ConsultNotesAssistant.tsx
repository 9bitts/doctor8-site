"use client";

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
} from "react";
import {
  Sparkles, Mic, Square, Loader2, AlertCircle, FileText, X, CheckCircle2,
} from "lucide-react";

type Lang = "pt" | "en" | "es";

const T: Record<string, Record<Lang, string>> = {
  title: {
    pt: "Assistente de notas",
    en: "Notes assistant",
    es: "Asistente de notas",
  },
  consent: {
    pt: "Confirmo que o paciente foi informado e consentiu com a gravação de áudio para auxílio na documentação clínica.",
    en: "I confirm the patient was informed and consented to audio recording for clinical documentation assistance.",
    es: "Confirmo que el paciente fue informado y consintió la grabación de audio para ayuda en la documentación clínica.",
  },
  start: { pt: "Iniciar gravação da consulta", en: "Start recording consultation", es: "Iniciar grabación de la consulta" },
  stop: { pt: "Parar, resumir e salvar na ficha", en: "Stop, summarize & save to chart", es: "Detener, resumir y guardar en ficha" },
  recording: { pt: "Gravando consulta", en: "Recording consultation", es: "Grabando consulta" },
  recordingHint: {
    pt: "Captura o microfone durante toda a consulta. Use alto-falante para incluir a voz do paciente.",
    en: "Captures the microphone for the whole visit. Use speakers to include the patient's voice.",
    es: "Captura el micrófono durante toda la consulta. Use altavoz para incluir la voz del paciente.",
  },
  processing: { pt: "Transcrevendo e gerando evolução…", en: "Transcribing and generating note…", es: "Transcribiendo y generando evolución…" },
  transcript: { pt: "Transcrição", en: "Transcript", es: "Transcripción" },
  summary: { pt: "Rascunho de evolução", en: "Evolution draft", es: "Borrador de evolución" },
  saveToChart: { pt: "Salvar na ficha", en: "Save to chart", es: "Guardar en la ficha" },
  regenerate: { pt: "Regenerar resumo", en: "Regenerate summary", es: "Regenerar resumen" },
  close: { pt: "Fechar", en: "Close", es: "Cerrar" },
  needConsent: { pt: "Marque o consentimento para iniciar.", en: "Check consent to start.", es: "Marque el consentimiento para iniciar." },
  micError: { pt: "Não foi possível acessar o microfone.", en: "Could not access the microphone.", es: "No se pudo acceder al micrófono." },
  aiNotConfigured: { pt: "IA não configurada (ANTHROPIC_API_KEY).", en: "AI not configured (ANTHROPIC_API_KEY).", es: "IA no configurada (ANTHROPIC_API_KEY)." },
  transcribeNotConfigured: {
    pt: "Transcrição não configurada (OPENAI_API_KEY). Cole a transcrição manualmente abaixo.",
    en: "Transcription not configured (OPENAI_API_KEY). Paste the transcript manually below.",
    es: "Transcripción no configurada (OPENAI_API_KEY). Pegue la transcripción manualmente abajo.",
  },
  genericError: { pt: "Não foi possível gerar o resumo. Tente novamente.", en: "Could not generate summary. Please try again.", es: "No se pudo generar el resumen. Inténtelo de nuevo." },
  pasteHint: { pt: "Ou cole a transcrição / anotações:", en: "Or paste transcript / notes:", es: "O pegue la transcripción / notas:" },
  summarizeText: { pt: "Gerar resumo e salvar na ficha", en: "Generate summary & save to chart", es: "Generar resumen y guardar en ficha" },
  reviewHint: { pt: "Revise antes de salvar na ficha", en: "Review before saving to chart", es: "Revise antes de guardar en la ficha" },
  autoSaveOnLeave: {
    pt: "Ao sair da chamada, gerar resumo e salvar na ficha automaticamente",
    en: "When leaving the call, auto-generate summary and save to chart",
    es: "Al salir de la llamada, generar resumen y guardar en ficha automáticamente",
  },
  savedToChart: { pt: "Evolução salva na ficha do paciente!", en: "Evolution saved to patient chart!", es: "¡Evolución guardada en la ficha del paciente!" },
  noChart: { pt: "Ficha do paciente não vinculada.", en: "Patient chart not linked.", es: "Ficha del paciente no vinculada." },
};

export type ConsultNotesAssistantHandle = {
  isRecording: () => boolean;
  isProcessing: () => boolean;
  shouldAutoSaveOnLeave: () => boolean;
  finalizeOnLeave: () => Promise<"saved" | "failed" | "skipped">;
};

type Props = {
  lang: Lang;
  patientRecordId: string | null;
  analysandRecordId?: string | null;
  appointmentId?: string | null;
  patientName?: string;
  onSaved?: () => void;
};

const ConsultNotesAssistant = forwardRef<ConsultNotesAssistantHandle, Props>(function ConsultNotesAssistant(
  { lang, patientRecordId, analysandRecordId, appointmentId, onSaved },
  ref,
) {
  const t = (k: string) => T[k]?.[lang] ?? T[k]?.["en"] ?? k;
  const isAnalysandChart = !!analysandRecordId;
  const chartId = analysandRecordId || patientRecordId;
  const aiNotesApi = isAnalysandChart
    ? "/api/psychoanalyst/ai-consult-notes"
    : "/api/professional/ai-consult-notes";

  function chartFields(): Record<string, string> {
    if (!chartId) return {};
    return isAnalysandChart
      ? { analysandRecordId: chartId }
      : { patientRecordId: chartId };
  }

  const [consent, setConsent] = useState(false);
  const [autoSaveOnLeave, setAutoSaveOnLeave] = useState(true);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [manualText, setManualText] = useState("");
  const [transcribeOk, setTranscribeOk] = useState(true);
  const [summarizeOk, setSummarizeOk] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveOnCompleteRef = useRef(false);
  const finalizeResolveRef = useRef<((v: "saved" | "failed") => void) | null>(null);

  useEffect(() => {
    fetch(aiNotesApi)
      .then((r) => r.json())
      .then((d) => {
        setTranscribeOk(!!d.transcribeConfigured);
        setSummarizeOk(!!d.summarizeConfigured);
      })
      .catch(() => {
        setTranscribeOk(false);
        setSummarizeOk(false);
      });
  }, [aiNotesApi]);

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

  const resolveFinalize = useCallback((result: "saved" | "failed") => {
    if (finalizeResolveRef.current) {
      finalizeResolveRef.current(result);
      finalizeResolveRef.current = null;
    }
  }, []);

  async function processPayload(
    input: FormData | Record<string, unknown>,
    options?: { saveToChart?: boolean; showModal?: boolean },
  ) {
    const saveToChart = options?.saveToChart ?? false;
    const showModal = options?.showModal ?? !saveToChart;

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      let res: Response;
      if (input instanceof FormData) {
        if (saveToChart) input.set("saveToChart", "true");
        res = await fetch(aiNotesApi, { method: "POST", body: input });
      } else {
        res = await fetch(aiNotesApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, ...(saveToChart ? { saveToChart: true } : {}) }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "AI_NOT_CONFIGURED") setError(t("aiNotConfigured"));
        else if (data.error === "TRANSCRIBE_NOT_CONFIGURED") setError(t("transcribeNotConfigured"));
        else if (data.error === "CONSENT_REQUIRED") setError(t("needConsent"));
        else setError(t("genericError"));
        resolveFinalize("failed");
        return false;
      }

      setTranscript(data.transcript || "");
      setSummary(data.summary || "");

      if (data.saved) {
        setSuccess(t("savedToChart"));
        onSaved?.();
        resolveFinalize("saved");
      } else if (showModal) {
        setShowResult(true);
      }

      return !!data.saved;
    } catch {
      setError(t("genericError"));
      resolveFinalize("failed");
      return false;
    } finally {
      setProcessing(false);
      saveOnCompleteRef.current = false;
    }
  }

  async function startRecording() {
    if (!consent) {
      setError(t("needConsent"));
      return;
    }
    if (!chartId) {
      setError(t("noChart"));
      return;
    }
    setError("");
    setSuccess("");
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
          resolveFinalize("failed");
          return;
        }
        const form = new FormData();
        form.append("consent", "true");
        form.append("audio", blob, "consult.webm");
        form.append("lang", lang);
        Object.entries(chartFields()).forEach(([k, v]) => form.append(k, v));
        if (appointmentId) form.append("appointmentId", appointmentId);
        if (saveOnCompleteRef.current) form.append("saveToChart", "true");
        await processPayload(form, { saveToChart: saveOnCompleteRef.current, showModal: !saveOnCompleteRef.current });
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      startTimer();
    } catch {
      setError(t("micError"));
      resolveFinalize("failed");
    }
  }

  function stopRecording(saveToChart = false) {
    saveOnCompleteRef.current = saveToChart;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function summarizeManual(saveToChart = true) {
    if (!consent) {
      setError(t("needConsent"));
      return;
    }
    if (!chartId) {
      setError(t("noChart"));
      return;
    }
    const text = manualText.trim();
    if (!text) return;
    await processPayload({
      consent: true,
      transcript: text,
      lang,
      ...chartFields(),
      appointmentId: appointmentId || undefined,
      saveToChart,
    }, { saveToChart, showModal: !saveToChart });
  }

  async function saveSummaryToChart() {
    if (!chartId || !summary.trim()) return;
    setProcessing(true);
    setError("");
    try {
      const title = lang === "pt"
        ? "Evolu\u00e7\u00e3o \u2014 teleconsulta"
        : lang === "es"
          ? "Evoluci\u00f3n \u2014 teleconsulta"
          : "Evolution \u2014 teleconsult";
      const res = isAnalysandChart
        ? await fetch("/api/psychoanalyst/session-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysandRecordId: chartId,
            content: summary.trim(),
            appointmentId: appointmentId || undefined,
          }),
        })
        : await fetch("/api/professional/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientRecordId: chartId,
            title,
            content: summary.trim(),
            recordKind: "EVOLUTION",
            type: "CLINICAL_NOTE",
          }),
        });
      if (!res.ok) {
        setError(t("genericError"));
        return;
      }
      setSuccess(t("savedToChart"));
      onSaved?.();
      setShowResult(false);
    } catch {
      setError(t("genericError"));
    } finally {
      setProcessing(false);
    }
  }

  async function regenerateSummary() {
    if (!transcript.trim()) return;
    await processPayload({
      consent: true,
      transcript: transcript.trim(),
      lang,
      ...chartFields(),
      appointmentId: appointmentId || undefined,
    }, { showModal: true });
  }

  useImperativeHandle(ref, () => ({
    isRecording: () => recording,
    isProcessing: () => processing,
    shouldAutoSaveOnLeave: () => consent && autoSaveOnLeave && !!chartId,
    finalizeOnLeave: () => new Promise((resolve) => {
      if (!recording) {
        resolve("skipped");
        return;
      }
      if (!chartId) {
        resolve("failed");
        return;
      }
      finalizeResolveRef.current = (result) => resolve(result);
      stopRecording(true);
    }),
  }), [recording, processing, consent, autoSaveOnLeave, chartId]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const canRecord = consent && transcribeOk && summarizeOk && !!chartId;

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

        {consent && chartId && (
          <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer leading-snug">
            <input
              type="checkbox"
              checked={autoSaveOnLeave}
              onChange={(e) => setAutoSaveOnLeave(e.target.checked)}
              className="mt-0.5 accent-emerald-500 shrink-0"
            />
            {t("autoSaveOnLeave")}
          </label>
        )}

        {recording ? (
          <div className="space-y-2">
            <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {t("recording")} {mm}:{ss}
            </p>
            <p className="text-[10px] text-slate-500 leading-snug">{t("recordingHint")}</p>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              disabled={processing}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 rounded-lg transition min-h-[44px]"
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
            disabled={!canRecord}
            title={!transcribeOk ? t("transcribeNotConfigured") : !summarizeOk ? t("aiNotConfigured") : undefined}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 py-2.5 rounded-lg transition min-h-[44px]"
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
              onClick={() => summarizeManual(true)}
              disabled={!consent || !manualText.trim() || !summarizeOk || !chartId}
              className="w-full text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg disabled:opacity-40 min-h-[44px]"
            >
              {t("summarizeText")}
            </button>
          </div>
        )}

        {success && (
          <p className="text-[11px] text-emerald-400 flex items-start gap-1">
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {success}
          </p>
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
              {chartId && (
                <button
                  type="button"
                  onClick={saveSummaryToChart}
                  disabled={!summary.trim() || processing}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 rounded-lg min-h-[44px]"
                >
                  {processing ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {t("saveToChart")}
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
});

export default ConsultNotesAssistant;
