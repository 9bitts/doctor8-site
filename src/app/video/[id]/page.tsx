"use client";

import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData, VideoConsultFetchResult } from "@/components/VideoConsultRoom";

export default function AppointmentVideoPage() {
  const params = useParams();
  const appointmentId = params.id as string;

  async function fetchSession(): Promise<VideoConsultFetchResult> {
    const res  = await fetch(`/api/appointments/${appointmentId}/video`);
    const d = await res.json();
    if (d.handoff === "google_meet" || d.error === "MEET_HANDOFF") {
      return {
        meetHandoff: {
          professionalName: d.professionalName || "",
          meetUrl: d.meetUrl,
          backHref: d.role === "professional" ? "/professional/appointments" : "/patient/appointments",
          backLabelKey: "appt.page.meetHandoffBack",
        },
      };
    }
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
    return { data: { ...d, kind: "appointment", appointmentId } };
  }

  return <VideoConsultRoom fetchSession={fetchSession} />;
}
