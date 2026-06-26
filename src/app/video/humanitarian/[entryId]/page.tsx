"use client";

import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData } from "@/components/VideoConsultRoom";

export default function HumanitarianVideoPage() {
  const params = useParams();
  const entryId = params.entryId as string;

  async function fetchSession(): Promise<{
    data?: VideoConsultData;
    error?: string;
  }> {
    const res = await fetch(`/api/humanitarian/queue/${entryId}/video`);
    const d = await res.json();
    if (!res.ok) {
      return { error: d.message || d.error || "No se pudo abrir la sala." };
    }
    return { data: { ...d, kind: "humanitarian", queueId: entryId, entryId } };
  }

  return <VideoConsultRoom fetchSession={fetchSession} />;
}
