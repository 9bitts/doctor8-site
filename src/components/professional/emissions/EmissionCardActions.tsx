"use client";

import { useState } from "react";
import {
  Copy, PenLine, Download, Loader2, CheckCircle2, Clock, Share2, Printer,
} from "lucide-react";
import WhatsappDeliverButton from "./WhatsappDeliverButton";
import Doctor8DeliverButton from "./Doctor8DeliverButton";
import type { EmissionKind } from "./EmissionsSignModal";
import {
  EMISSION_ACTIONS_ROW,
  EMISSION_BTN_AMBER,
  EMISSION_BTN_BRAND,
  EMISSION_BTN_NEUTRAL,
} from "./emission-button-styles";

type MedItem = { name: string; dosage?: string; frequency?: string; duration?: string; instructions?: string };

function emissionShareUrl(kind: EmissionKind): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://doctor8.app";
  if (kind === "prescription") return `${base}/patient/prescriptions`;
  return `${base}/patient/documents`;
}

function PdfDownloadButton({
  url, t, onError,
}: {
  url: string;
  t: (k: string) => string;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  async function download() {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        onError(typeof d.error === "string" ? d.error : t("rx.signedPdfUnavailable"));
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "documento.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      onError(t("rx.signedPdfUnavailable"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" onClick={download} disabled={loading} className={EMISSION_BTN_NEUTRAL}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {t("rx.downloadPDF")}
    </button>
  );
}

export function EmissionCardActions({
  kind,
  emissionId,
  signatureStatus,
  patientNotifiedAt,
  whatsappNotifyStatus,
  patientName,
  medications,
  examItems,
  title,
  content,
  t,
  onReuse,
  onSign,
  onShare,
  onCopy,
  onPrint,
  onPdfError,
  onDelivered,
}: {
  kind: EmissionKind;
  emissionId: string;
  documentId?: string;
  signatureStatus?: string | null;
  patientNotifiedAt?: boolean;
  whatsappNotifyStatus?: string | null;
  patientName: string;
  medications?: MedItem[];
  examItems?: string[];
  title?: string;
  content?: string | null;
  t: (k: string) => string;
  layout?: "row" | "column";
  onReuse?: () => void;
  onSign?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  onPrint?: () => void;
  onPdfError?: (message: string) => void;
  onDelivered?: () => void;
}) {
  const signed = signatureStatus === "SIGNED";
  const pending = signatureStatus === "PENDING";
  const pdfUrl = kind === "prescription"
    ? `/api/professional/prescriptions/${emissionId}/pdf`
    : `/api/professional/documents/${emissionId}/pdf`;
  const shareUrl = emissionShareUrl(kind);
  const delivered = !!patientNotifiedAt;

  function defaultCopy() {
    const lines: string[] = [];
    if (title) lines.push(title);
    if (medications?.length) {
      medications.forEach((m, i) => {
        lines.push(`${i + 1}. ${m.name}${m.dosage ? ` - ${m.dosage}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`);
      });
    }
    if (examItems?.length) {
      examItems.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    }
    if (content) lines.push(content);
    void navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className={EMISSION_ACTIONS_ROW}>
      <button type="button" onClick={onCopy || defaultCopy} className={EMISSION_BTN_NEUTRAL}>
        <Copy size={14} /> {t("rec.copy")}
      </button>

      {onPrint && (
        <button type="button" onClick={onPrint} className={EMISSION_BTN_NEUTRAL}>
          <Printer size={14} /> {t("rec.print")}
        </button>
      )}

      {onReuse && (
        <button type="button" onClick={onReuse} className={EMISSION_BTN_NEUTRAL}>
          <Copy size={14} /> {t("rx.reuse")}
        </button>
      )}

      {!signed && !pending && onSign && (
        <button type="button" onClick={onSign} className={`${EMISSION_BTN_NEUTRAL} text-brand-600 border-brand-200 bg-brand-50`}>
          <PenLine size={14} /> {t("rx.sign")}
        </button>
      )}

      {pending && (
        <span className={EMISSION_BTN_AMBER}>
          <Clock size={14} /> {t("rx.signPending")}
        </span>
      )}

      {signed && (
        <span className={EMISSION_BTN_BRAND}>
          <CheckCircle2 size={14} /> {t("rx.signed")}
        </span>
      )}

      {onPdfError && (
        <PdfDownloadButton url={pdfUrl} t={t} onError={onPdfError} />
      )}

      {(onShare || !delivered) && (
        delivered ? (
          <span className={EMISSION_BTN_BRAND}>
            <CheckCircle2 size={14} /> {t("brand.doctor8")}
          </span>
        ) : onShare ? (
          <button type="button" onClick={onShare} className={EMISSION_BTN_NEUTRAL}>
            <Share2 size={14} /> {t("rec.shareWithPatient")}
          </button>
        ) : (
          <Doctor8DeliverButton
            kind={kind}
            id={emissionId}
            t={t}
            size="card"
            initialDelivered={delivered}
            onDelivered={() => onDelivered?.()}
            onError={onPdfError}
          />
        )
      )}

      {signed && (
        <WhatsappDeliverButton
          kind={kind}
          id={emissionId}
          patientName={patientName}
          shareUrl={shareUrl}
          t={t}
          defaultMessage={t("rx.flow.whatsappMessage")}
          initialStatus={whatsappNotifyStatus}
          size="card"
        />
      )}
    </div>
  );
}
