"use client";

import { useParams } from "next/navigation";
import VideoConsultRoom, { VideoConsultData, VideoConsultFetchResult } from "@/components/VideoConsultRoom";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

const ERR: Record<string, string> = {
  pt: "N\u00e3o foi poss\u00edvel abrir a sala.",
  en: "Could not open the room.",
  es: "No se pudo abrir la sala.",
};

function roomError(): string {
  if (typeof window === "undefined") return ERR.es;
  try {
    const saved = window.localStorage.getItem("doctor8.lang") || "";
    if (saved.startsWith("pt")) return ERR.pt;
    if (saved.startsWith("en")) return ERR.en;
  } catch { /* ignore */ }
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith("pt")) return ERR.pt;
  if (nav.startsWith("en")) return ERR.en;
  return ERR.es;
}

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
        window.location.href = `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}/tcle?return=${encodeURIComponent(`/video/humanitarian/${entryId}`)}`;
        return { error: "Redirecting to consent form..." };
      }
      if (d.error === "NOT_READY" || res.status === 425) {
        try {
          const sess = await fetch("/api/auth/session").then((r) => r.json());
          const role = sess?.user?.role as string | undefined;
          const dest =
            role && role !== "PATIENT"
              ? "/humanitarian/volunteer"
              : `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
          window.location.replace(dest);
        } catch {
          window.location.replace(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`);
        }
        return { error: "Redirecting..." };
      }
      return { error: d.message || d.error || roomError() };
    }
    return { data: { ...d, kind: "humanitarian", queueId: entryId, entryId } };
  }

  return <VideoConsultRoom fetchSession={fetchSession} />;
}
