"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { openUrlAfterAsync } from "@/lib/open-url-safely";

type EmissionKind = "prescription" | "exam" | "document";

type Props = {
  kind: EmissionKind;
  id: string;
  patientName: string;
  shareUrl: string;
  t: (k: string) => string;
  defaultMessage?: string;
  initialStatus?: string | null;
  compact?: boolean;
  onStatusChange?: (status: string) => void;
};

export default function WhatsappDeliverButton({
  kind,
  id,
  patientName,
  shareUrl,
  t,
  defaultMessage,
  initialStatus,
  compact,
  onStatusChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(initialStatus || "");
  const [error, setError] = useState("");

  const previewMessage = useMemo(() => {
    const base = defaultMessage || t("wa.defaultMessage");
    return base
      .replace(/\{\{name\}\}/g, patientName)
      .replace(/\{\{link\}\}/g, shareUrl);
  }, [defaultMessage, patientName, shareUrl, t]);

  const [message, setMessage] = useState(previewMessage);

  async function send(force = false) {
    setSending(true);
    setError("");
    try {
      await openUrlAfterAsync(async () => {
        const deliverKind = kind === "prescription" ? "prescription"
          : kind === "exam" ? "exam" : "document";
        const res = await fetch("/api/professional/emissions/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: deliverKind,
            id,
            message,
            force,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("wa.sendError"));
          throw new Error("DELIVER_FAILED");
        }
        const next = data.status || "FAILED";
        setStatus(next);
        onStatusChange?.(next);
        if (data.status === "SENT") setOpen(false);
        if (data.status === "NO_PHONE") {
          setError(t("wa.noPhone"));
          throw new Error("NO_URL");
        }
        if (data.status === "FAILED") {
          setError(data.error || t("wa.sendError"));
          throw new Error("DELIVER_FAILED");
        }
        if (data.status === "SKIPPED" && data.waMeUrl) {
          return data.waMeUrl as string;
        }
        throw new Error("NO_URL");
      });
    } catch (e) {
      if (!(e instanceof Error && (e.message === "NO_URL" || e.message === "DELIVER_FAILED"))) {
        setError(t("wa.sendError"));
      }
    } finally {
      setSending(false);
    }
  }

  const statusLabel = status === "SENT"
    ? t("wa.statusSent")
    : status === "FAILED"
      ? t("wa.statusFailed")
      : status === "NO_PHONE"
        ? t("wa.noPhone")
        : status === "SKIPPED"
          ? t("wa.statusSkipped")
          : "";

  const btnClass = compact
    ? "flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 px-3 py-2 rounded-xl text-xs font-semibold transition w-full"
    : "w-full py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-800 font-semibold text-sm transition flex items-center justify-center gap-2";

  return (
    <>
      {statusLabel && (
        <p className={`text-xs flex items-center gap-1 mb-1 ${
          status === "SENT" ? "text-green-700" : status === "NO_PHONE" ? "text-amber-700" : "text-slate-500"
        }`}>
          {status === "SENT" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {statusLabel}
        </p>
      )}

      <button type="button" onClick={() => { setMessage(previewMessage); setOpen(true); }}
        className={btnClass}>
        <MessageCircle size={compact ? 13 : 18} />
        {status === "SENT" ? t("wa.resend") : t("wa.send")}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle size={18} className="text-green-600" />
              {t("wa.previewTitle")}
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none"
            />
            <p className="text-[10px] text-slate-400">{t("wa.previewHint")}</p>
            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">
                {t("common.cancel")}
              </button>
              <button type="button" onClick={() => send(status === "SENT")} disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                {t("wa.confirmSend")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
