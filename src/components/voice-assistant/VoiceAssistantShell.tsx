"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic, Square, Loader2, X, Sparkles, CheckCircle2, AlertCircle, Navigation, FileText,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { voiceT } from "@/lib/voice-assistant/i18n";
import { resolveVoicePortalFromPathname } from "@/lib/voice-assistant/portal-resolver";
import {
  storeVoiceClinicalNote,
  storeVoiceFormPrefill,
  storeVoicePrefill,
  notifyVoiceFormPrefillReady,
  notifyVoicePrescriptionPrefillReady,
} from "@/lib/voice-assistant/prefill-storage";
import { getVoiceSessionContext, saveVoiceSessionContext } from "@/lib/voice-assistant/voice-session-context";
import type { VoicePortalId, VoiceProcessResult } from "@/lib/voice-assistant/types";

type Props = {
  portalId: VoicePortalId | null;
  userId?: string;
  variant?: "fab" | "header";
};

function pickRecordingMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function audioFileExtension(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  return "webm";
}

function routeBasePath(route: string): string {
  return route.split("?")[0];
}

function routesShareBasePath(a: string, b: string): boolean {
  return routeBasePath(a) === routeBasePath(b);
}

export default function VoiceAssistantShell({ portalId, userId, variant = "fab" }: Props) {
  const { lang } = useI18n();
  const t = (k: string) => voiceT(k, lang);
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [result, setResult] = useState<VoiceProcessResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const activePortal = portalId || resolveVoicePortalFromPathname(pathname);

  useEffect(() => {
    setRecordingSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        !!pickRecordingMime(),
    );
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const resetSession = useCallback(() => {
    setError(null);
    setResult(null);
    setTranscript("");
    setManualText("");
    setCopied(false);
  }, []);

  useEffect(() => {
    function onOpenFromBanner() {
      resetSession();
      setOpen(true);
    }
    window.addEventListener("doctor8:voice-assistant:open", onOpenFromBanner);
    return () => window.removeEventListener("doctor8:voice-assistant:open", onOpenFromBanner);
  }, [resetSession]);

  const processCommand = useCallback(
    async (text?: string, audioBlob?: Blob, mime?: string) => {
      if (!activePortal) return;
      if (!consent) {
        setError(t("needConsent"));
        return;
      }

      setProcessing(true);
      setError(null);
      setResult(null);

      try {
        let res: Response;

        if (audioBlob) {
          const form = new FormData();
          form.append("consent", "true");
          form.append("portalId", activePortal);
          form.append("lang", lang);
          form.append("pathname", pathname);
          const session = getVoiceSessionContext();
          if (session?.patientRecordId) {
            form.append("sessionPatientRecordId", session.patientRecordId);
          }
          form.append("audio", audioBlob, `voice.${audioFileExtension(mime || "audio/webm")}`);
          res = await fetch("/api/voice-assistant/process", { method: "POST", body: form });
        } else {
          const payload = (text || manualText || transcript).trim();
          if (!payload) return;
          setTranscript(payload);
          const session = getVoiceSessionContext();
          res = await fetch("/api/voice-assistant/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consent: true,
              portalId: activePortal,
              lang,
              pathname,
              transcript: payload,
              sessionPatientRecordId: session?.patientRecordId,
            }),
          });
        }

        const data = (await res.json()) as VoiceProcessResult & { error?: string };
        if (!res.ok) {
          if (data.error === "AI_NOT_CONFIGURED" || data.error === "TRANSCRIBE_NOT_CONFIGURED") {
            setError(t("aiNotConfigured"));
          } else {
            setError(t("genericError"));
          }
          return;
        }

        setTranscript(data.transcript || text || manualText);
        setResult(data);
      } catch {
        setError(t("genericError"));
      } finally {
        setProcessing(false);
      }
    },
    [activePortal, consent, lang, manualText, pathname, t, transcript],
  );

  const startRecording = useCallback(async () => {
    if (!consent) {
      setError(t("needConsent"));
      return;
    }
    resetSession();
    const mime = pickRecordingMime();
    if (!mime) {
      setError(t("micError"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size > 0) await processCommand(undefined, blob, mime);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
    } catch {
      stopStream();
      setError(t("micError"));
    }
  }, [consent, processCommand, resetSession, stopStream, t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const applyResult = useCallback(() => {
    if (!result || !activePortal) return;

    const navigateAfterPrefill = (route: string, notify: () => void) => {
      if (routesShareBasePath(pathname, route) && !route.includes("?")) {
        notify();
      } else {
        router.push(route);
        if (routesShareBasePath(pathname, route)) {
          window.setTimeout(notify, 150);
        }
      }
      setOpen(false);
    };

    if (result.action === "navigate") {
      router.push(result.route);
      setOpen(false);
      return;
    }

    if (result.action === "prescription_prefill") {
      storeVoicePrefill({
        type: "prescription",
        portalId: activePortal,
        prefill: result.prefill,
        createdAt: Date.now(),
      });
      if (result.prefill.patient?.patientRecordId) {
        saveVoiceSessionContext({
          portalId: activePortal,
          patientRecordId: result.prefill.patient.patientRecordId,
          patientName: result.prefill.patient.displayName,
        });
      }
      navigateAfterPrefill(result.route, notifyVoicePrescriptionPrefillReady);
      return;
    }

    if (result.action === "form_prefill") {
      storeVoiceFormPrefill({
        type: "form",
        portalId: activePortal,
        formType: result.formType,
        patientRecordId: result.patientRecordId,
        patientName: result.patientName,
        data: result.data,
        createdAt: Date.now(),
      });
      if (result.patientRecordId) {
        saveVoiceSessionContext({
          portalId: activePortal,
          patientRecordId: result.patientRecordId,
          patientName: result.patientName,
        });
      }
      navigateAfterPrefill(result.route, notifyVoiceFormPrefillReady);
      return;
    }

    if (result.action === "clinical_note") {
      storeVoiceClinicalNote({
        draft: result.draft,
        patientRecordId: result.patientRecordId,
        patientName: result.patientName,
        portalId: activePortal,
      });
      if (result.chartRoute) {
        router.push(result.chartRoute);
      }
      setOpen(false);
      return;
    }
  }, [activePortal, pathname, result, router]);

  if (!activePortal || !userId) return null;

  const triggerBtn =
    variant === "header" ? (
      <button
        type="button"
        onClick={() => { resetSession(); setOpen(true); }}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition"
        aria-label={t("headerLabel")}
      >
        <Mic size={14} />
        <span className="hidden md:inline">{t("headerLabel")}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => { resetSession(); setOpen(true); }}
        className="fixed z-[45] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 sm:left-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label={t("openLabel")}
      >
        <Mic size={22} />
        <span className="absolute -top-1 -right-1 w-4 h-4 border-2 border-white bg-violet-400 rounded-full" />
      </button>
    );

  return (
    <>
      {triggerBtn}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !processing && !recording && setOpen(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200">
            <div
              className="sticky top-0 px-5 py-4 rounded-t-2xl sm:rounded-t-2xl flex items-start justify-between gap-3"
              style={{ background: "linear-gradient(90deg, #6d28d9 0%, #4338ca 100%)" }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-white" />
                  <h2 className="font-bold text-lg text-white">{t("title")}</h2>
                </div>
                <p className="text-sm mt-0.5" style={{ color: "#ede9fe" }}>{t("subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => !processing && !recording && setOpen(false)}
                className="p-2 rounded-lg transition shrink-0"
                style={{ color: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" }}
                aria-label={t("closeAssistant")}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>{t("consent")}</span>
              </label>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!result && (
                <>
                  <p className="text-sm text-slate-500">{t("speakHint")}</p>

                  <div className="flex flex-col items-center gap-3 py-2">
                    {recording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg animate-pulse"
                      >
                        <Square size={28} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={processing || !recordingSupported}
                        onClick={startRecording}
                        className="w-20 h-20 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white flex items-center justify-center shadow-lg transition"
                      >
                        {processing ? <Loader2 size={32} className="animate-spin" /> : <Mic size={32} />}
                      </button>
                    )}
                    <p className="text-sm font-medium text-slate-700">
                      {processing ? t("processing") : recording ? t("recording") : t("startRecording")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t("pasteFallback")}
                    </label>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      rows={3}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      placeholder={t("speakHint")}
                    />
                    <button
                      type="button"
                      disabled={processing || !manualText.trim()}
                      onClick={() => processCommand(manualText)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40"
                    >
                      {t("submitText")}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-slate-50"
                  >
                    {t("closeAssistant")}
                  </button>
                </>
              )}

              {result && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t("transcript")}</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{transcript}</p>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-violet-800 font-semibold">
                      <CheckCircle2 size={18} />
                      {t("understood")}
                    </div>
                    <p className="text-sm text-slate-700">{result.message}</p>
                    <p className="text-xs text-violet-700">{t("reviewHint")}</p>

                    {result.action === "form_prefill" && (
                      <pre className="whitespace-pre-wrap text-xs bg-white rounded-lg border border-slate-200 p-3 max-h-40 overflow-y-auto font-sans text-slate-700">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}

                    {result.action === "prescription_prefill" && (
                      <div className="text-sm space-y-2">
                        {result.prefill.patient && (
                          <p><span className="font-medium">{t("patient")}:</span> {result.prefill.patient.displayName}</p>
                        )}
                        {result.prefill.medications.length > 0 && (
                          <div>
                            <p className="font-medium">{t("medications")}:</p>
                            <ul className="list-disc pl-5 text-slate-700">
                              {result.prefill.medications.map((m, i) => (
                                <li key={i}>
                                  {m.name}
                                  {m.dosage ? ` — ${m.dosage}` : ""}
                                  {m.frequency ? `, ${m.frequency}` : ""}
                                  {m.duration ? `, ${m.duration}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {result.action === "clinical_note" && (
                      <div className="text-sm">
                        <p className="font-medium mb-1">{t("draft")}</p>
                        <pre className="whitespace-pre-wrap text-xs bg-white rounded-lg border border-slate-200 p-3 max-h-48 overflow-y-auto font-sans text-slate-700">
                          {result.draft}
                        </pre>
                      </div>
                    )}

                    {result.action === "clarify" && (
                      <div className="text-sm">
                        <p className="font-medium">{t("clarify")}</p>
                        <p>{result.question}</p>
                        {result.options && (
                          <ul className="mt-2 space-y-1">
                            {result.options.map((opt) => (
                              <li key={opt}>
                                <button
                                  type="button"
                                  className="text-violet-700 underline text-left"
                                  onClick={() => {
                                    setManualText(`${transcript}. ${opt}`);
                                    setResult(null);
                                    void processCommand(`${transcript}. ${opt}`);
                                  }}
                                >
                                  {opt}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(result.action === "navigate" ||
                      result.action === "prescription_prefill" ||
                      result.action === "form_prefill" ||
                      result.action === "clinical_note") && (
                      <button
                        type="button"
                        onClick={applyResult}
                        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-sm font-semibold"
                        style={{ backgroundColor: "#6d28d9" }}
                      >
                        {result.action === "navigate" ? <Navigation size={16} /> : <FileText size={16} />}
                        {result.action === "navigate" ? t("navigate") : t("apply")}
                      </button>
                    )}

                    {result.action === "clinical_note" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(result.draft);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                      >
                        {copied ? t("copied") : t("copyDraft")}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={resetSession}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
                    >
                      {t("editTranscript")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="py-2.5 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-slate-50"
                    >
                      {t("closeAssistant")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
