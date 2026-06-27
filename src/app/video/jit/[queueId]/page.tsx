"use client";

import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData } from "@/components/VideoConsultRoom";

export default function JitVideoPage() {
  const params = useParams();
  const queueId = params.queueId as string;

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
    return { data: { ...d, kind: "jit", queueId } };
  }

  return <VideoConsultRoom fetchSession={fetchSession} />;
}
