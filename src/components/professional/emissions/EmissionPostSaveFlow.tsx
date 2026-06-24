"use client";

import { useState } from "react";
import {
  CheckCircle2, PenLine, Loader2, FileText, Send, MessageCircle,
} from "lucide-react";
import { EmissionsSignModal, type EmissionKind, type SignTarget } from "./EmissionsSignModal";
import type { Chart } from "./types";

export interface SavedEmission {
  kind: EmissionKind;
  id: string;
  patient: Chart;
  label: string;
}

interface EmissionPostSaveFlowProps {
  emission: SavedEmission;
  t: (k: string) => string;
  lang: string;
  signConfig: { configured: boolean; cpfMasked: string } | null;
  initialStep?: "choose" | "success";
  initialShareUrl?: string;
  onDone: () => void;
}

export function EmissionPostSaveFlow({
  emission, t, lang, signConfig, initialStep = "choose", initialShareUrl = "", onDone,
}: EmissionPostSaveFlowProps) {
  const [step, setStep] = useState<"choose" | "success">(initialStep);
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState("");
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const patient = emission.patient;
  const savedTitleKey =
    emission.kind === "prescription" ? "rx3.savedTitle"
      : emission.kind === "exam" ? "rx.flow.examSaved"
        : "rx.flow.documentSaved";

  async function deliverToPatient() {
    setDelivering(true);
    setDeliverError("");
    try {
      const deliverKind = emission.kind === "prescription" ? "prescription"
        : emission.kind === "exam" ? "exam" : "document";
      const res = await fetch("/api/professional/emissions/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: deliverKind, id: emission.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeliverError(typeof data.error === "string" ? data.error : t("rx.flow.deliverError"));
        return false;
      }
      setShareUrl(data.shareUrl || "");
      setStep("success");
      return true;
    } catch {
      setDeliverError(t("rx.flow.deliverError"));
      return false;
    } finally {
      setDelivering(false);
    }
  }

  async function handleSendUnsigned() {
    await deliverToPatient();
  }

  function handleSign() {
    setSignTarget({
      kind: emission.kind,
      id: emission.id,
      label: emission.label,
    });
  }

  async function sendInvite() {
    setInviteSending(true);
    setInviteError("");
    try {
      const res = await fetch(`/api/professional/records/${patient.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      if (res.ok) setInviteSent(true);
      else {
        const d = await res.json().catch(() => ({}));
        setInviteError(typeof d.error === "string" ? d.error : t("rx3.inviteError"));
      }
    } catch {
      setInviteError(t("rx3.inviteError"));
    } finally {
      setInviteSending(false);
    }
  }

  function openWhatsApp() {
    const url = shareUrl || `${window.location.origin}/register`;
    const msg = t("rx.flow.whatsappMessage")
      .replace("{{name}}", `${patient.firstName} ${patient.lastName}`)
      .replace("{{link}}", url);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  if (step === "success") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mb-3">
            <CheckCircle2 size={28} className="text-brand-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">{t(savedTitleKey)}</p>
          <p className="text-slate-500 text-sm mt-1">{patient.firstName} {patient.lastName}</p>
        </div>

        {patient.hasAccount ? (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-brand-500 shrink-0 mt-0.5" />
            <p>{t("rx3.notifiedText")}</p>
          </div>
        ) : patient.email ? (
          inviteSent ? (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
              {t("rx3.inviteSent")} <strong>{patient.email}</strong>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-amber-800">{t("rx3.noAccountText")}</p>
              <p className="text-sm font-semibold text-amber-900">{patient.email}</p>
              {inviteError && <p className="text-sm text-rose-600">{inviteError}</p>}
              <button onClick={sendInvite} disabled={inviteSending}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                {inviteSending && <Loader2 size={14} className="animate-spin" />}
                {t("rx3.sendInvite")}
              </button>
            </div>
          )
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
            {t("rx3.noEmailText")}
          </div>
        )}

        <button onClick={openWhatsApp}
          className="w-full py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-800 font-semibold text-sm transition flex items-center justify-center gap-2">
          <MessageCircle size={18} /> {t("rx.flow.whatsappShare")}
        </button>

        <button onClick={onDone}
          className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition">
          {t("rx3.done")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mb-3">
            <FileText size={28} className="text-brand-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">{t(savedTitleKey)}</p>
          <p className="text-slate-500 text-sm mt-1">{patient.firstName} {patient.lastName}</p>
          <p className="text-xs text-slate-400 mt-2 max-w-sm">{t("rx.flow.signPrompt")}</p>
        </div>

        {deliverError && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{deliverError}</p>
        )}

        <div className="space-y-3">
          <button onClick={handleSign} disabled={delivering}
            className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
            <PenLine size={18} /> {t("rx.flow.signNow")}
          </button>
          <button onClick={handleSendUnsigned} disabled={delivering}
            className="w-full py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
            {delivering ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {t("rx.flow.sendUnsigned")}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">{t("rx.flow.signHint")}</p>
      </div>

      {signTarget && (
        <EmissionsSignModal
          target={signTarget}
          signConfig={signConfig}
          deliverAfter
          onClose={() => setSignTarget(null)}
        />
      )}
    </>
  );
}
