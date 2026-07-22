"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Video, X } from "lucide-react";

type Lang = "pt" | "en" | "es";

const LABELS: Record<Lang, { consult: string; with: string; back: string; dismiss: string }> = {
  pt: { consult: "Consulta em andamento", with: "com", back: "Voltar à videochamada", dismiss: "Dispensar aviso" },
  en: { consult: "Consultation in progress", with: "with", back: "Back to video call", dismiss: "Dismiss banner" },
  es: { consult: "Consulta en curso", with: "con", back: "Volver a la videollamada", dismiss: "Descartar aviso" },
};

function stripReturnUrlFromLocation() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("returnUrl")) return;
    url.searchParams.delete("returnUrl");
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", qs ? `${url.pathname}?${qs}` : url.pathname);
  } catch { /* ignore */ }
}

export default function VideoConsultReturnBanner({
  returnUrl,
  patientName,
  lang = "pt",
  onInactive,
}: {
  returnUrl?: string | null;
  patientName?: string;
  lang?: Lang;
  /** Called when the linked consult is no longer active (clear local draft/state). */
  onInactive?: () => void;
}) {
  const [active, setActive] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const onInactiveRef = useRef(onInactive);
  onInactiveRef.current = onInactive;

  useEffect(() => {
    setDismissed(false);
  }, [returnUrl]);

  useEffect(() => {
    if (!returnUrl) {
      setActive(null);
      return;
    }

    let cancelled = false;
    setActive(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/video/return-active?path=${encodeURIComponent(returnUrl)}`,
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const ok = res.ok && data.active === true;
        setActive(ok);
        if (!ok) {
          stripReturnUrlFromLocation();
          onInactiveRef.current?.();
        }
      } catch {
        // Keep showing on transient network errors; only hide when the API says inactive.
        if (!cancelled) setActive(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [returnUrl]);

  function dismiss() {
    setDismissed(true);
    stripReturnUrlFromLocation();
    onInactiveRef.current?.();
  }

  if (!returnUrl || dismissed || active !== true) return null;
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
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={returnUrl}
          className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition"
        >
          {l.back}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg hover:bg-white/15 transition"
          aria-label={l.dismiss}
          title={l.dismiss}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
