"use client";

import Link from "next/link";
import { Video } from "lucide-react";

type Lang = "pt" | "en" | "es";

const LABELS: Record<Lang, { consult: string; with: string; back: string }> = {
  pt: { consult: "Consulta em andamento", with: "com", back: "Voltar à videochamada" },
  en: { consult: "Consultation in progress", with: "with", back: "Back to video call" },
  es: { consult: "Consulta en curso", with: "con", back: "Volver a la videollamada" },
};

export default function VideoConsultReturnBanner({
  returnUrl,
  patientName,
  lang = "pt",
}: {
  returnUrl?: string | null;
  patientName?: string;
  lang?: Lang;
}) {
  if (!returnUrl) return null;
  const l = LABELS[lang] ?? LABELS.pt;

  return (
    <div className="bg-emerald-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm sticky top-0 z-40 shadow-md">
      <p className="flex items-center gap-2 min-w-0">
        <Video size={16} className="shrink-0" />
        <span className="truncate">
          {l.consult}
          {patientName ? ` ${l.with} ${patientName}` : ""}
        </span>
      </p>
      <Link
        href={returnUrl}
        className="shrink-0 text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
      >
        {l.back}
      </Link>
    </div>
  );
}
