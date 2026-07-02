"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReviewPromptModal from "@/components/ReviewPromptModal";

type PastAppt = {
  id: string;
  scheduledAt: string;
  professionalId?: string;
  psychoanalystId?: string;
  providerType?: "health" | "psychoanalyst";
  professional: { firstName: string; lastName: string };
};

type ReviewStatus = {
  professionalIds: string[];
  psychoanalystIds: string[];
};

const RECENT_MS = 48 * 60 * 60 * 1000;

export default function PatientPostConsultReview() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [modal, setModal] = useState<{
    providerId: string;
    providerType: "health" | "psychoanalyst";
    providerName: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      try {
        const [apptRes, reviewRes] = await Promise.all([
          fetch("/api/appointments?status=COMPLETED"),
          fetch("/api/patient/reviews"),
        ]);
        if (!apptRes.ok || !reviewRes.ok || cancelled) return;

        const apptData = await apptRes.json();
        const reviewData: ReviewStatus = await reviewRes.json();
        const reviewedPro = new Set(reviewData.professionalIds || []);
        const reviewedPa = new Set(reviewData.psychoanalystIds || []);

        const recent = ((apptData.appointments || []) as PastAppt[])
          .filter((a) => Date.now() - new Date(a.scheduledAt).getTime() <= RECENT_MS)
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

        for (const apt of recent) {
          const providerType = apt.providerType ?? (apt.psychoanalystId ? "psychoanalyst" : "health");
          const providerId =
            providerType === "psychoanalyst"
              ? apt.psychoanalystId || apt.professionalId
              : apt.professionalId || apt.psychoanalystId;
          if (!providerId) continue;

          const alreadyReviewed =
            providerType === "psychoanalyst"
              ? reviewedPa.has(providerId)
              : reviewedPro.has(providerId);
          if (alreadyReviewed) continue;

          const guardKey = `doctor8.reviewPrompted.${userId}.${apt.id}`;
          if (localStorage.getItem(guardKey)) continue;

          const name = `${apt.professional?.firstName || ""} ${apt.professional?.lastName || ""}`.trim();
          setModal({
            providerId,
            providerType,
            providerName: name,
          });
          localStorage.setItem(guardKey, "1");
          break;
        }
      } catch {
        /* silent */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!modal) return null;

  return (
    <ReviewPromptModal
      providerId={modal.providerId}
      providerType={modal.providerType}
      providerName={modal.providerName}
      onClose={() => setModal(null)}
    />
  );
}
