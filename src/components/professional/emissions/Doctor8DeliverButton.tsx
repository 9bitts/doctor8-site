"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { EMISSION_BTN_BRAND, EMISSION_BTN_DOCTOR8, EMISSION_BTN_FULL } from "./emission-button-styles";

type EmissionKind = "prescription" | "exam" | "document";

type Props = {
  kind: EmissionKind;
  id: string;
  t: (k: string) => string;
  size?: "card" | "full";
  sendWhatsApp?: boolean;
  onDelivered?: (data: { shareUrl?: string; hasPhone?: boolean; whatsappStatus?: string }) => void;
  onError?: (message: string) => void;
  initialDelivered?: boolean;
};

export default function Doctor8DeliverButton({
  kind,
  id,
  t,
  size = "card",
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

  const label = size === "card" ? t("brand.doctor8") : t("rx.flow.sendDoctor8");
  const iconSize = size === "card" ? 14 : 18;

  if (delivered) {
    if (size === "card") {
      return (
        <span className={EMISSION_BTN_BRAND}>
          <CheckCircle2 size={14} /> {t("brand.doctor8")}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 text-brand-700 text-sm">
        <CheckCircle2 size={18} className="shrink-0" />
        <span>{t("rx.flow.deliveredDoctor8")}</span>
      </div>
    );
  }

  const btnClass = size === "card"
    ? EMISSION_BTN_DOCTOR8
    : `${EMISSION_BTN_FULL} bg-brand-500 hover:bg-brand-600 text-white`;

  return (
    <button type="button" onClick={deliver} disabled={delivering} className={btnClass}>
      {delivering ? <Loader2 size={iconSize} className="animate-spin" /> : <Send size={iconSize} />}
      {label}
    </button>
  );
}
