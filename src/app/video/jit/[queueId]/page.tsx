"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData } from "@/components/VideoConsultRoom";
import VideoMediaPrecheckGate from "@/components/VideoMediaPrecheckGate";
import JitSessionHeartbeat from "@/components/professional/JitSessionHeartbeat";
import { setVideoNavContext } from "@/lib/safe-nav";

export default function JitVideoPage() {
  const params = useParams();
  const queueId = params.queueId as string;
  const [jitHeartbeatEnabled, setJitHeartbeatEnabled] = useState(false);

  const fetchSession = useCallback(async (): Promise<{
    data?: VideoConsultData;
    error?: string;
    opensAt?: string;
  }> => {
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
  }, [queueId]);

  return (
    <VideoMediaPrecheckGate>
      <JitSessionHeartbeat enabled={jitHeartbeatEnabled} />
      <VideoConsultRoom fetchSession={fetchSession} />
    </VideoMediaPrecheckGate>
  );
}
