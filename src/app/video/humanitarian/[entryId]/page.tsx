"use client";

import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData, VideoConsultFetchResult } from "@/components/VideoConsultRoom";

export default function HumanitarianVideoPage() {
  const params = useParams();
  const entryId = params.entryId as string;

  async function fetchSession(): Promise<VideoConsultFetchResult> {
    const res = await fetch(`/api/humanitarian/queue/${entryId}/video`);
    const d = await res.json();
    if (!res.ok) {
      if (d.error === "WHATSAPP_HANDOFF") {
        return {
          whatsappHandoff: {
            professionalName: d.professionalName || "",
            campaignSlug: d.campaignSlug,
          },
        };
      }
      if (d.error === "MEET_HANDOFF") {
        return {
          meetHandoff: {
            professionalName: d.professionalName || "",
            campaignSlug: d.campaignSlug,
            meetUrl: d.meetUrl,
          },
        };
      }
      if (d.error === "TCLE_REQUIRED") {
        window.location.href = `/humanitarian/venezuela-terremoto-2026/tcle?return=${encodeURIComponent(`/video/humanitarian/${entryId}`)}`;
        return { error: "Redirecting to consent form..." };
      }
      return { error: d.message || d.error || "No se pudo abrir la sala." };
    }
    return { data: { ...d, kind: "humanitarian", queueId: entryId, entryId } };
  }

  return <VideoConsultRoom fetchSession={fetchSession} />;
}
