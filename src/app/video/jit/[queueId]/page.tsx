"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, VideoOff, RefreshCw, AlertCircle } from "lucide-react";
import VideoConsultRoom, { VideoConsultData } from "@/components/VideoConsultRoom";
import JitSessionHeartbeat from "@/components/professional/JitSessionHeartbeat";
import { setVideoNavContext } from "@/lib/safe-nav";

type MediaCheck = "checking" | "granted" | "denied" | "unavailable";

export default function JitVideoPage() {
  const params = useParams();
  const queueId = params.queueId as string;
  const { t } = useI18n();
  const [mediaCheck, setMediaCheck] = useState<MediaCheck>("checking");
  const [jitHeartbeatEnabled, setJitHeartbeatEnabled] = useState(false);

  const runMediaCheck = useCallback(async () => {
    setMediaCheck("checking");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaCheck("granted");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMediaCheck("granted");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMediaCheck("denied");
      } else {
        setMediaCheck("unavailable");
      }
    }
  }, []);

  useEffect(() => { void runMediaCheck(); }, [runMediaCheck]);

  async function fetchSession(): Promise<{
    data?: VideoConsultData;
    error?: string;
    opensAt?: string;
  }> {
    const res = await fetch(`/api/jit/queue/${queueId}/video`);
    const d = await res.json();
    if (!res.ok) {
      if (d.error === "TCLE_REQUIRED") {
        window.location.href = `/patient/tcle?returnUrl=${encodeURIComponent(`/video/jit/${queueId}`)}`;
        return { error: "Redirecting to consent form..." };
      }
      return { error: d.message || d.error || "Could not open the video room." };
    }

    const isProfessional = d.role === "professional";
    setJitHeartbeatEnabled(isProfessional);
    setVideoNavContext({
      role: isProfessional ? "professional" : "patient",
      backHref: typeof d.backHref === "string" ? d.backHref : undefined,
    });

    return { data: { ...d, kind: "jit", queueId } };
  }

  if (mediaCheck === "checking") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 p-4">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
        <p className="text-sm text-slate-400">{t("videoPerm.checking")}</p>
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
        </div>
      </div>
    );
  }

  if (mediaCheck === "unavailable") {
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
        </div>
      </div>
    );
  }

  return (
    <>
      <JitSessionHeartbeat enabled={jitHeartbeatEnabled} />
      <VideoConsultRoom fetchSession={fetchSession} />
    </>
  );
}
