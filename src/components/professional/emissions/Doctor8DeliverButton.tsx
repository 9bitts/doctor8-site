"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

type EmissionKind = "prescription" | "exam" | "document";

type Props = {
  kind: EmissionKind;
  id: string;
  t: (k: string) => string;
  compact?: boolean;
  sendWhatsApp?: boolean;
  onDelivered?: (data: { shareUrl?: string; hasPhone?: boolean; whatsappStatus?: string }) => void;
  onError?: (message: string) => void;
  initialDelivered?: boolean;
};

export default function Doctor8DeliverButton({
  kind,
  id,
  t,
  compact,
  sendWhatsApp = false,
  onDelivered,
  onError,
  initialDelivered = false,
}: Props) {
  const [delivering, setDelivering] = useState(false);
  const [delivered, setDelivered] = useState(initialDelivered);

  async function deliver() {
    setDelivering(true);
    try {
      const deliverKind = kind === "prescription" ? "prescription"
        : kind === "exam" ? "exam" : "document";
      const res = await fetch("/api/professional/emissions/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: deliverKind, id, sendWhatsApp }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : t("rx.flow.deliverError");
        onError?.(msg);
        return;
      }
      setDelivered(true);
      onDelivered?.({
        shareUrl: data.shareUrl,
        hasPhone: data.patient?.hasPhone,
        whatsappStatus: data.whatsapp?.status,
      });
    } catch {
      onError?.(t("rx.flow.deliverError"));
    } finally {
      setDelivering(false);
    }
  }

  const btnClass = compact
    ? "flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition w-full disabled:opacity-50"
    : "w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50";

  if (delivered) {
    return (
      <div className={`flex items-center gap-2 text-brand-700 ${compact ? "text-xs" : "text-sm"}`}>
        <CheckCircle2 size={compact ? 14 : 18} className="shrink-0" />
        <span>{t("rx.flow.deliveredDoctor8")}</span>
      </div>
    );
  }

  return (
    <button type="button" onClick={deliver} disabled={delivering} className={btnClass}>
      {delivering ? <Loader2 size={compact ? 13 : 18} className="animate-spin" /> : <Send size={compact ? 13 : 18} />}
      {t("rx.flow.sendDoctor8")}
    </button>
  );
}
