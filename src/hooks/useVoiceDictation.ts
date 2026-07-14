"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n/translations";
import { audioFileExtension, pickRecordingMime } from "@/lib/voice-recording";

export type VoiceDictationLabels = {
  micError: string;
  transcribing: string;
  notSupported: string;
  transcribeNotConfigured: string;
  genericError: string;
};

type Options = {
  lang: Lang;
  onText: (text: string) => void;
  getCurrentText: () => string;
  maxLength?: number;
  labels: VoiceDictationLabels;
  disabled?: boolean;
};

function speechLang(lang: Lang): string {
  if (lang === "pt") return "pt-BR";
  if (lang === "es") return "es-ES";
  return "en-US";
}

function appendDictation(current: string, fragment: string, maxLength?: number): string {
  const trimmed = fragment.trim();
  if (!trimmed) return current;
  const needsSpace = current.length > 0 && !/[\s]$/.test(current);
  const combined = current + (needsSpace ? " " : "") + trimmed;
  return maxLength ? combined.slice(0, maxLength) : combined;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useVoiceDictation({
  lang,
  onText,
  getCurrentText,
  maxLength,
  labels,
  disabled = false,
}: Options) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const modeRef = useRef<"speech" | "recorder" | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const wantRecordingRef = useRef(false);
  const baseTextRef = useRef("");
  const recorderMimeRef = useRef("audio/webm");
  const transcribeConfiguredRef = useRef(true);

  const applyText = useCallback(
    (text: string) => {
      onText(maxLength ? text.slice(0, maxLength) : text);
    },
    [maxLength, onText],
  );

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    wantRecordingRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state !== "inactive") {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    stopStream();
    modeRef.current = null;
  }, [stopStream]);

  useEffect(() => {
    const speechCtor = getSpeechRecognitionCtor();
    const recorderMime = pickRecordingMime();
    const recorderOk =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!recorderMime;

    setSupported(!!speechCtor || recorderOk);

    if (recorderOk) {
      fetch("/api/professional/transcribe", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          transcribeConfiguredRef.current = !!data?.configured;
        })
        .catch(() => {
          transcribeConfiguredRef.current = false;
        });
    }

    return cleanup;
  }, [cleanup]);

  const transcribeBlob = useCallback(
    async (blob: Blob, mime: string) => {
      setProcessing(true);
      setError("");
      try {
        const form = new FormData();
        form.append("audio", blob, `dictation.${audioFileExtension(mime)}`);
        form.append("lang", lang);
        const res = await fetch("/api/professional/transcribe", {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "TRANSCRIBE_NOT_CONFIGURED") {
            setError(labels.transcribeNotConfigured);
          } else {
            setError(labels.genericError);
          }
          return;
        }
        const transcript = typeof data.transcript === "string" ? data.transcript : "";
        applyText(appendDictation(baseTextRef.current, transcript, maxLength));
      } catch {
        setError(labels.genericError);
      } finally {
        setProcessing(false);
        setRecording(false);
      }
    },
    [applyText, lang, labels.genericError, labels.transcribeNotConfigured, maxLength],
  );

  const startSpeechRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    baseTextRef.current = getCurrentText();
    wantRecordingRef.current = true;
    modeRef.current = "speech";

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang(lang);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
      }
      if (finalChunk) {
        baseTextRef.current = appendDictation(baseTextRef.current, finalChunk, maxLength);
        applyText(baseTextRef.current);
      }
    };

    recognition.onerror = () => {
      if (wantRecordingRef.current) setError(labels.micError);
      wantRecordingRef.current = false;
      setRecording(false);
      setProcessing(false);
    };

    recognition.onend = () => {
      if (wantRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          wantRecordingRef.current = false;
          setRecording(false);
        }
        return;
      }
      setRecording(false);
      setProcessing(false);
      recognitionRef.current = null;
      modeRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setRecording(true);
      setError("");
      return true;
    } catch {
      wantRecordingRef.current = false;
      recognitionRef.current = null;
      modeRef.current = null;
      return false;
    }
  }, [applyText, getCurrentText, labels.micError, lang, maxLength]);

  const startMediaRecording = useCallback(async () => {
    const mime = pickRecordingMime();
    if (!mime) {
      setError(labels.notSupported);
      return false;
    }
    if (!transcribeConfiguredRef.current) {
      setError(labels.transcribeNotConfigured);
      return false;
    }

    baseTextRef.current = getCurrentText();
    recorderMimeRef.current = mime;
    modeRef.current = "recorder";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mime });
        mediaRecorderRef.current = null;
        modeRef.current = null;
        if (blob.size > 0) {
          void transcribeBlob(blob, mime);
        } else {
          setRecording(false);
          setProcessing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      setError("");
      return true;
    } catch {
      stopStream();
      setError(labels.micError);
      return false;
    }
  }, [
    getCurrentText,
    labels.micError,
    labels.notSupported,
    labels.transcribeNotConfigured,
    stopStream,
    transcribeBlob,
  ]);

  const start = useCallback(async () => {
    if (disabled || recording || processing) return;
    setError("");

    if (startSpeechRecognition()) return;
    await startMediaRecording();
  }, [disabled, processing, recording, startMediaRecording, startSpeechRecognition]);

  const stop = useCallback(() => {
    if (!recording) return;
    wantRecordingRef.current = false;

    if (modeRef.current === "speech") {
      recognitionRef.current?.stop();
      return;
    }

    if (modeRef.current === "recorder") {
      setProcessing(true);
      mediaRecorderRef.current?.stop();
    }
  }, [recording]);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  return {
    supported,
    recording,
    processing,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(""),
  };
}
