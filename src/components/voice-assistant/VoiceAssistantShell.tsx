"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic, Square, Loader2, X, Sparkles, CheckCircle2, AlertCircle, Navigation, FileText,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { voiceT } from "@/lib/voice-assistant/i18n";
import { resolveVoicePortalFromPathname, resolveSkillsPortalFromPathname } from "@/lib/voice-assistant/portal-resolver";
import { getPortalVoiceExamples, formatVoiceHint } from "@/lib/voice-assistant/portal-examples";
import OwlIcon from "@/components/voice-assistant/OwlIcon";
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
  const [phase, setPhase] = useState<"idle" | "transcribing" | "interpreting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [manualText, setManualText] = useState("");
  const [result, setResult] = useState<VoiceProcessResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [voiceContext, setVoiceContext] = useState<{
    skillsPortalId: VoicePortalId;
    examples: string[];
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const activePortal = portalId || resolveVoicePortalFromPathname(pathname);
  const skillsPortal =
    voiceContext?.skillsPortalId ||
    resolveSkillsPortalFromPathname(pathname) ||
    activePortal;
  const portalExamples =
    voiceContext?.examples ||
    (skillsPortal ? getPortalVoiceExamples(skillsPortal) : []);
  const speakHint = skillsPortal
    ? formatVoiceHint(skillsPortal, t("speakHint"))
    : t("speakHint");

  useEffect(() => {
    if (!activePortal) {
      setVoiceContext(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/voice-assistant/context?portalId=${encodeURIComponent(activePortal)}&pathname=${encodeURIComponent(pathname)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.skillsPortalId) return;
        setVoiceContext({
          skillsPortalId: data.skillsPortalId,
          examples: data.examples ?? [],
        });
      })
      .catch(() => {
        if (!cancelled) setVoiceContext(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activePortal, pathname]);

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
    setReviewText("");
    setManualText("");
    setCopied(false);
    setPhase("idle");
  }, []);

  useEffect(() => {
    function onOpenFromBanner() {
      resetSession();
      setOpen(true);
    }
    window.addEventListener("doctor8:voice-assistant:open", onOpenFromBanner);
    return () => window.removeEventListener("doctor8:voice-assistant:open", onOpenFromBanner);
  }, [resetSession]);

  const interpretTranscript = useCallback(
    async (payload: string) => {
      if (!activePortal) return;
      const trimmed = payload.trim();
      if (!trimmed) return;

      setProcessing(true);
      setPhase("interpreting");
      setError(null);
      setResult(null);

      try {
        const session = getVoiceSessionContext();
        const res = await fetch("/api/voice-assistant/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consent: true,
            mode: "process",
            portalId: activePortal,
            lang,
            pathname,
            transcript: trimmed,
            sessionPatientRecordId: session?.patientRecordId,
          }),
        });
        const data = (await res.json()) as VoiceProcessResult & { error?: string };
        if (!res.ok) {
          if (data.error === "AI_NOT_CONFIGURED" || data.error === "TRANSCRIBE_NOT_CONFIGURED") {
            setError(t("aiNotConfigured"));
          } else {
            setError(t("genericError"));
          }
          return;
        }
        setTranscript(data.transcript || trimmed);
        setReviewText(data.reviewText || data.transcript || trimmed);
        setResult(data);
      } catch {
        setError(t("genericError"));
      } finally {
        setProcessing(false);
        setPhase("idle");
      }
    },
    [activePortal, lang, pathname, t],
  );

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
        if (audioBlob) {
          setPhase("transcribing");
          const form = new FormData();
          form.append("consent", "true");
          form.append("mode", "transcribe");
          form.append("portalId", activePortal);
          form.append("lang", lang);
          form.append("pathname", pathname);
          const session = getVoiceSessionContext();
          if (session?.patientRecordId) {
            form.append("sessionPatientRecordId", session.patientRecordId);
          }
          form.append("audio", audioBlob, `voice.${audioFileExtension(mime || "audio/webm")}`);
          const res = await fetch("/api/voice-assistant/process", { method: "POST", body: form });
          const data = (await res.json()) as VoiceProcessResult & { error?: string };
          if (!res.ok) {
            if (data.error === "AI_NOT_CONFIGURED" || data.error === "TRANSCRIBE_NOT_CONFIGURED") {
              setError(t("aiNotConfigured"));
            } else {
              setError(t("genericError"));
            }
            return;
          }
          const heard = data.transcript || "";
          setTranscript(heard);
          setReviewText(heard);
          setProcessing(false);
          await interpretTranscript(heard);
          return;
        }

        const payload = (text || manualText || transcript).trim();
        if (!payload) return;
        setTranscript(payload);
        setReviewText(payload);
        setProcessing(false);
        await interpretTranscript(payload);
      } catch {
        setError(t("genericError"));
        setProcessing(false);
        setPhase("idle");
      }
    },
    [activePortal, consent, interpretTranscript, lang, manualText, pathname, t, transcript],
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
        className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
        style={{
          color: "#4338ca",
          background: "linear-gradient(135deg, rgba(224,231,255,0.9) 0%, rgba(237,233,254,0.95) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
        }}
        aria-label={t("headerLabel")}
      >
        <OwlIcon size={16} />
        <span className="hidden md:inline">{t("headerLabel")}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => { resetSession(); setOpen(true); }}
        className="fixed z-[45] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 sm:hidden w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0891b2 0%, #6366f1 55%, #7c3aed 100%)",
          color: "#ffffff",
          boxShadow: "0 10px 28px rgba(99, 102, 241, 0.45), 0 0 0 1px rgba(255,255,255,0.15) inset",
        }}
        aria-label={t("openLabel")}
      >
        <OwlIcon size={26} variant="light" />
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
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #312e81 55%, #4338ca 100%)" }}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(103, 232, 249, 0.25)",
                    }}
                  >
                    <OwlIcon size={20} variant="light" />
                  </div>
                  <h2 className="font-bold text-lg text-white">{t("title")}</h2>
                </div>
                <p className="text-sm mt-1 pl-[2.625rem]" style={{ color: "#cbd5e1" }}>{t("subtitle")}</p>
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

              {!result && !transcript && (
                <>
                  <p className="text-sm text-slate-500">{speakHint}</p>
                  {portalExamples.length > 1 && (
                    <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                      {portalExamples.slice(1, 3).map((ex) => (
                        <li key={ex}>{ex}</li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-col items-center gap-3 py-2">
                    {recording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 rounded-2xl shadow-lg animate-pulse font-semibold text-base"
                        style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                      >
                        <Square size={24} fill="currentColor" strokeWidth={0} />
                        {t("stopRecording")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={processing || !recordingSupported}
                        onClick={startRecording}
                        className="w-full max-w-xs flex flex-col items-center justify-center gap-2 px-6 py-4 rounded-2xl shadow-lg transition disabled:opacity-40"
                        style={{ backgroundColor: processing ? "#475569" : "#6d28d9", color: "#ffffff" }}
                      >
                        {processing ? (
                          <>
                            <Loader2 size={32} className="animate-spin" />
                            <span className="text-sm font-semibold">
                              {phase === "transcribing"
                                ? t("transcribing")
                                : phase === "interpreting"
                                  ? t("interpreting")
                                  : t("processing")}
                            </span>
                          </>
                        ) : (
                          <>
                            <Mic size={32} strokeWidth={2.5} />
                            <span className="text-sm font-semibold">{t("startRecording")}</span>
                          </>
                        )}
                      </button>
                    )}
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
                      placeholder={speakHint}
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

              {(result || transcript) && (!result || result.action !== "transcript_ready") && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t("transcript")}</p>
                    <textarea
                      value={reviewText || transcript}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={3}
                      className="w-full text-sm text-slate-800 bg-white rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                    {transcript && reviewText && transcript.trim() !== reviewText.trim() && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        STT: {transcript}
                      </p>
                    )}
                    {(!result || processing) && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-violet-800">
                        <Loader2 size={16} className="animate-spin" />
                        {phase === "transcribing" ? t("transcribing") : t("interpreting")}
                      </div>
                    )}
                    {result && (
                      <button
                        type="button"
                        disabled={processing || !reviewText.trim()}
                        onClick={() => void interpretTranscript(reviewText)}
                        className="mt-2 w-full py-2 rounded-xl border border-violet-200 text-violet-800 text-sm font-medium bg-violet-50 disabled:opacity-40"
                      >
                        {processing && phase === "interpreting" ? (
                          <span className="inline-flex items-center gap-2 justify-center">
                            <Loader2 size={14} className="animate-spin" />
                            {t("interpreting")}
                          </span>
                        ) : (
                          t("reinterpret")
                        )}
                      </button>
                    )}
                  </div>

                  {!result ? null : (
                  <>

                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-violet-800 font-semibold">
                      <CheckCircle2 size={18} />
                      {t("draftReady")}
                    </div>
                    <p className="text-sm text-slate-700">{result.message}</p>
                    <p className="text-xs text-violet-700">{t("reviewHint")}</p>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700/80 mb-2">{t("fillPreview")}</p>

                      {result.action === "form_prefill" && (
                        <div className="text-sm space-y-2 bg-white rounded-lg border border-slate-200 p-3">
                          <p>
                            <span className="font-medium">{t("formType")}:</span>{" "}
                            {result.formType === "exam_request" ? t("examItems") : result.formType}
                          </p>
                          {result.patientName && (
                            <p><span className="font-medium">{t("patient")}:</span> {result.patientName}</p>
                          )}
                          {result.formType === "exam_request" &&
                            Array.isArray((result.data as { examItems?: string[] }).examItems) && (
                              <div>
                                <p className="font-medium">{t("examItems")}:</p>
                                <ul className="list-disc pl-5 text-slate-700">
                                  {((result.data as { examItems?: string[] }).examItems ?? []).map((item, i) => (
                                    <li key={`${item}-${i}`}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {result.formType !== "exam_request" && (
                            <pre className="whitespace-pre-wrap text-xs max-h-40 overflow-y-auto font-sans text-slate-700">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}

                      {result.action === "prescription_prefill" && (
                        <div className="text-sm space-y-2 bg-white rounded-lg border border-slate-200 p-3">
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
                        <div className="text-sm bg-white rounded-lg border border-slate-200 p-3">
                          <p className="font-medium mb-1">{t("draft")}</p>
                          <pre className="whitespace-pre-wrap text-xs max-h-48 overflow-y-auto font-sans text-slate-700">
                            {result.draft}
                          </pre>
                        </div>
                      )}

                      {result.action === "navigate" && (
                        <p className="text-sm bg-white rounded-lg border border-slate-200 p-3 text-slate-700">
                          {result.route}
                        </p>
                      )}

                      {result.action === "clarify" && (
                        <div className="text-sm bg-white rounded-lg border border-slate-200 p-3 space-y-2">
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
                                      const next = `${reviewText || transcript}. ${opt}`;
                                      setReviewText(next);
                                      setResult(null);
                                      void interpretTranscript(next);
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

                      {result.action === "unknown" && (
                        <p className="text-sm bg-white rounded-lg border border-amber-200 p-3 text-amber-900">
                          {result.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(result.action === "navigate" ||
                      result.action === "prescription_prefill" ||
                      result.action === "form_prefill" ||
                      result.action === "clinical_note") && (
                      <button
                        type="button"
                        disabled={
                          processing ||
                          reviewText.trim() !== (result.reviewText || result.transcript).trim()
                        }
                        onClick={applyResult}
                        className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                        style={{ backgroundColor: "#6d28d9" }}
                        title={
                          reviewText.trim() !== (result.reviewText || result.transcript).trim()
                            ? t("reinterpret")
                            : undefined
                        }
                      >
                        {result.action === "navigate" ? <Navigation size={16} /> : <FileText size={16} />}
                        {t("confirmSend")}
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
                      {t("speakAgain")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="py-2.5 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-slate-50"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                  </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
