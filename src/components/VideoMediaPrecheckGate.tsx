"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Loader2, VideoOff, RefreshCw, AlertCircle, Video, Mic } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Lang } from "@/lib/i18n/translations";

type MediaCheck =
  | "idle"
  | "checking"
  | "granted"
  | "denied"
  | "notfound"
  | "unavailable"
  | "audio_only_ok";

/** Daily join reads this to start with camera off (session-scoped, no account impact). */
export const VIDEO_START_VIDEO_OFF_KEY = "doctor8.video.startVideoOff";

const MEDIA_PROMPT: Record<string, Record<Lang, string>> = {
  idleTitle: {
    pt: "Pronto para entrar na consulta",
    en: "Ready to join the consultation",
    es: "Listo para entrar a la consulta",
  },
  idleIntro: {
    pt: "Toque abaixo para testar câmera e microfone antes de entrar na sala de vídeo.",
    en: "Tap below to test your camera and microphone before joining the video room.",
    es: "Toca abajo para probar cámara y micrófono antes de entrar a la sala de video.",
  },
  idleButton: {
    pt: "Testar câmera e entrar",
    en: "Test camera and join",
    es: "Probar cámara y entrar",
  },
  notFoundTitle: {
    pt: "Nenhuma câmera ou microfone detectado",
    en: "No camera or microphone detected",
    es: "No se detectó cámara ni micrófono",
  },
  notFoundIntro: {
    pt: "Não encontramos câmera ou microfone neste dispositivo. Verifique se o aparelho possui câmera frontal e microfone funcionando.",
    en: "We couldn't find a camera or microphone on this device. Check that your device has a working front camera and microphone.",
    es: "No encontramos cámara ni micrófono en este dispositivo. Verifica que tu teléfono tenga cámara frontal y micrófono funcionando.",
  },
  notFoundStep1: {
    pt: "Feche outros apps que possam estar usando a câmera (WhatsApp, Instagram, etc.).",
    en: "Close other apps that may be using the camera (WhatsApp, Instagram, etc.).",
    es: "Cierra otras apps que puedan estar usando la cámara (WhatsApp, Instagram, etc.).",
  },
  notFoundStep2: {
    pt: "Reinicie o Safari se o problema persistir.",
    en: "Restart Safari if the problem persists.",
    es: "Reinicia Safari si el problema persiste.",
  },
  audioOnlyTitle: {
    pt: "Câmera indisponível — microfone ok",
    en: "Camera unavailable — microphone OK",
    es: "Cámara no disponible — micrófono OK",
  },
  audioOnlyIntro: {
    pt: "Você pode entrar só com áudio. O médico ainda poderá falar com você; a câmera fica desligada.",
    en: "You can join with audio only. Your doctor can still talk with you; the camera stays off.",
    es: "Puedes entrar solo con audio. El médico aún podrá hablar contigo; la cámara queda apagada.",
  },
  audioOnlyButton: {
    pt: "Entrar só com áudio",
    en: "Join with audio only",
    es: "Entrar solo con audio",
  },
  continueAnyway: {
    pt: "Tentar entrar mesmo assim",
    en: "Try to join anyway",
    es: "Intentar entrar de todos modos",
  },
};

function isDeviceNotFoundError(name: string): boolean {
  return name === "NotFoundError" || name === "DevicesNotFoundError";
}

function clearStartVideoOffFlag() {
  try {
    sessionStorage.removeItem(VIDEO_START_VIDEO_OFF_KEY);
  } catch {
    /* ignore */
  }
}

function setStartVideoOffFlag() {
  try {
    sessionStorage.setItem(VIDEO_START_VIDEO_OFF_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** AGD-28 — shared camera/mic pre-check before scheduled or JIT video rooms. */
export default function VideoMediaPrecheckGate({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const [mediaCheck, setMediaCheck] = useState<MediaCheck>("idle");

  const tp = useCallback(
    (key: keyof typeof MEDIA_PROMPT) => MEDIA_PROMPT[key][lang] ?? MEDIA_PROMPT[key].en,
    [lang],
  );

  const enterWithAudioOnly = useCallback(() => {
    setStartVideoOffFlag();
    setMediaCheck("granted");
  }, []);

  const enterAnyway = useCallback(() => {
    // Let Daily prompt inside the room; prefer camera off to avoid hard fail loops.
    setStartVideoOffFlag();
    setMediaCheck("granted");
  }, []);

  const runMediaCheck = useCallback(async () => {
    setMediaCheck("checking");
    clearStartVideoOffFlag();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaCheck("granted");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMediaCheck("granted");
      return;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      // Camera failed — microfone sozinho já desbloqueia a consulta.
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        audioOnly.getTracks().forEach((track) => track.stop());
        setMediaCheck("audio_only_ok");
        return;
      } catch {
        /* classify original AV failure below */
      }
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMediaCheck("denied");
      } else if (isDeviceNotFoundError(name)) {
        setMediaCheck("notfound");
      } else {
        setMediaCheck("unavailable");
      }
    }
  }, []);

  if (mediaCheck === "granted") {
    return <>{children}</>;
  }

  if (mediaCheck === "idle") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
            <Video size={24} className="text-emerald-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{tp("idleTitle")}</h1>
          <p className="text-sm text-slate-600">{tp("idleIntro")}</p>
          <button
            type="button"
            onClick={() => void runMediaCheck()}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <Video size={15} /> {tp("idleButton")}
          </button>
        </div>
      </div>
    );
  }

  if (mediaCheck === "checking") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 p-4">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
        <p className="text-sm text-slate-400">{t("videoPerm.checking")}</p>
      </div>
    );
  }

  if (mediaCheck === "audio_only_ok") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">
            <Mic size={24} className="text-sky-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{tp("audioOnlyTitle")}</h1>
          <p className="text-sm text-slate-600">{tp("audioOnlyIntro")}</p>
          <button
            type="button"
            onClick={enterWithAudioOnly}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <Mic size={15} /> {tp("audioOnlyButton")}
          </button>
          <button
            type="button"
            onClick={() => void runMediaCheck()}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm transition hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} /> {t("videoPerm.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (mediaCheck === "denied") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <VideoOff size={24} className="text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{t("videoPerm.deniedTitle")}</h1>
          <p className="text-sm text-slate-600">{t("videoPerm.deniedIntro")}</p>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal pl-5">
            <li>{t("videoPerm.deniedStep1")}</li>
            <li>{t("videoPerm.deniedStep2")}</li>
            <li>{t("videoPerm.deniedStep3")}</li>
          </ol>
          <button
            type="button"
            onClick={() => void runMediaCheck()}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} /> {t("videoPerm.retry")}
          </button>
          <button
            type="button"
            onClick={enterAnyway}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm transition hover:bg-slate-50"
          >
            {tp("continueAnyway")}
          </button>
        </div>
      </div>
    );
  }

  if (mediaCheck === "notfound") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
            <AlertCircle size={24} className="text-rose-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{tp("notFoundTitle")}</h1>
          <p className="text-sm text-slate-600">{tp("notFoundIntro")}</p>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal pl-5">
            <li>{tp("notFoundStep1")}</li>
            <li>{tp("notFoundStep2")}</li>
          </ol>
          <button
            type="button"
            onClick={() => void runMediaCheck()}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} /> {t("videoPerm.retry")}
          </button>
          <button
            type="button"
            onClick={enterAnyway}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm transition hover:bg-slate-50"
          >
            {tp("continueAnyway")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
          <AlertCircle size={24} className="text-rose-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{t("videoPerm.unavailableTitle")}</h1>
        <p className="text-sm text-slate-600">{t("videoPerm.unavailableText")}</p>
        <button
          type="button"
          onClick={() => void runMediaCheck()}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
        >
          <RefreshCw size={15} /> {t("videoPerm.retry")}
        </button>
        <button
          type="button"
          onClick={enterAnyway}
          className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm transition hover:bg-slate-50"
        >
          {tp("continueAnyway")}
        </button>
      </div>
    </div>
  );
}
