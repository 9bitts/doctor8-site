"use client";

import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData } from "@/components/VideoConsultRoom";

export default function AppointmentVideoPage() {
  const params = useParams();
  const appointmentId = params.id as string;

  async function fetchSession(): Promise<{
    data?: VideoConsultData;
    error?: string;
    opensAt?: string;
  }> {
    const res = await fetch(`/api/appointments/${appointmentId}/video`);
    const d = await res.json();
    if (!res.ok) {
      if (d.error === "TOO_EARLY") {
        return { error: d.message, opensAt: d.opensAt };
      }
      if (d.error === "TCLE_REQUIRED") {
        window.location.href = `/patient/tcle?returnUrl=${encodeURIComponent(`/video/${appointmentId}`)}`;
        return { error: "Redirecting to consent form..." };
      }
      return { error: d.message || d.error || "Could not open the video room." };
    }
    return { data: { ...d, kind: "appointment" } };
  }

  return <VideoConsultRoom fetchSession={fetchSession} />;
}
