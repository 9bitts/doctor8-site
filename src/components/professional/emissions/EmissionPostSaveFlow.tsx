"use client";

import { useState } from "react";
import {
  CheckCircle2, PenLine, Loader2, FileText, Send, MessageCircle,
} from "lucide-react";
import { EmissionsSignModal, type EmissionKind, type SignTarget } from "./EmissionsSignModal";
import Doctor8DeliverButton from "./Doctor8DeliverButton";
import { openWhatsAppShareLink } from "./whatsapp-share-link";
import { openAuthenticatedPdf } from "@/lib/open-url-safely";
import type { Chart } from "./types";

export interface ReviewMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface SavedEmission {
  kind: EmissionKind;
  id: string;
  patient: Chart;
  label: string;
  medications?: ReviewMedication[];
  instructions?: string;
  examItems?: string[];
  examNotes?: string;
  documentBody?: string;
}

interface EmissionPostSaveFlowProps {
  emission: SavedEmission;
  t: (k: string) => string;
  lang: string;
  signConfig: { configured: boolean; cpfMasked: string } | null;
  initialStep?: "review" | "choose" | "deliver" | "success";
  initialShareUrl?: string;
  onDone: () => void;
  /** Skip digital signature step — go straight to deliver */
  deliveryOnly?: boolean;
  apiBase?: string;
}

export function EmissionPostSaveFlow({
  emission, t, lang, signConfig, initialStep = "choose", initialShareUrl = "", onDone,
  deliveryOnly = false,
  apiBase = "/api/professional",
}: EmissionPostSaveFlowProps) {
  const [step, setStep] = useState<"review" | "choose" | "deliver" | "success">(
    initialStep === "review" ? "review"
      : deliveryOnly && initialStep === "choose" ? "deliver"
        : initialStep,
  );
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState("");
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [doctor8Delivered, setDoctor8Delivered] = useState(initialStep === "success" && !!initialShareUrl);
  const [pdfLoading, setPdfLoading] = useState(false);

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
      const res = await fetch(`${apiBase}/emissions/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          kind: deliverKind,
          id: emission.id,
          sendWhatsApp: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeliverError(typeof data.error === "string" ? data.error : t("rx.flow.deliverError"));
        return false;
      }
      setShareUrl(data.shareUrl || "");
      setDoctor8Delivered(true);
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
      const res = await fetch(`${apiBase}/records/${patient.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
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
    openWhatsAppShareLink({
      patientName: `${patient.firstName} ${patient.lastName}`,
      shareUrl: shareUrl || `${window.location.origin}/patient/documents`,
      messageTemplate: t("rx.flow.whatsappMessage"),
    });
  }

  if (step === "review") {
    const pdfUrl = emission.kind === "prescription"
      ? `${apiBase}/prescriptions/${emission.id}/pdf?lang=${lang}`
      : `${apiBase}/documents/${emission.id}/pdf?lang=${lang}`;
    const reviewTitle = emission.kind === "exam"
      ? t("rx.review.examTitle")
      : emission.kind === "document"
        ? t("rx.review.documentTitle")
        : t("rx.review.title");
    const reviewSubtitle = emission.kind === "exam"
      ? t("rx.review.examSubtitle")
      : emission.kind === "document"
        ? t("rx.review.documentSubtitle")
        : t("rx.review.subtitle");

    async function previewPdf() {
      setPdfLoading(true);
      try {
        await openAuthenticatedPdf(pdfUrl);
      } catch {
        /* user can retry */
      } finally {
        setPdfLoading(false);
      }
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mb-3">
            <FileText size={28} className="text-brand-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">{reviewTitle}</p>
          <p className="text-slate-500 text-sm mt-1">{patient.firstName} {patient.lastName}</p>
          <p className="text-xs text-slate-400 mt-2 max-w-sm">{reviewSubtitle}</p>
        </div>

        {emission.medications && emission.medications.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("rx.review.medications")}</p>
            <ul className="space-y-2">
              {emission.medications.map((med, i) => (
                <li key={i} className="text-sm text-slate-700 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <p className="font-semibold">{med.name}</p>
                  {(med.dosage || med.frequency || med.duration) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[med.dosage, med.frequency, med.duration].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {med.instructions && (
                    <p className="text-xs text-slate-500 mt-0.5">{med.instructions}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {emission.examItems && emission.examItems.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("rx.examItems")}</p>
            <ul className="space-y-2">
              {emission.examItems.map((item, i) => (
                <li key={i} className="text-sm text-slate-700 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {emission.instructions && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t("rx.review.instructions")}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{emission.instructions}</p>
          </div>
        )}

        {emission.examNotes && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t("rx.examNotes")}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{emission.examNotes}</p>
          </div>
        )}

        {emission.documentBody && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{emission.label}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{emission.documentBody}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void previewPdf()}
          disabled={pdfLoading}
          className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2"
        >
          {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {t("rx.review.previewPdf")}
        </button>

        <button
          type="button"
          onClick={() => setStep("choose")}
          className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition"
        >
          {t("rx.review.confirm")}
        </button>
      </div>
    );
  }

  if (step === "deliver") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mb-3">
            <CheckCircle2 size={28} className="text-brand-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">{t("rx.flow.signedTitle")}</p>
          <p className="text-slate-500 text-sm mt-1">{patient.firstName} {patient.lastName}</p>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
          <p>{patient.hasAccount ? t("rx.flow.doctor8Notice") : t("rx.flow.doctor8NoticeNoAccount")}</p>
        </div>

        {deliverError && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{deliverError}</p>
        )}

        <div className="space-y-3">
          <button onClick={deliverToPatient} disabled={delivering}
            className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
            {delivering ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {t("rx.flow.sendDoctor8")}
          </button>

          <button onClick={onDone} disabled={delivering}
            className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-sm transition">
            {t("rx.flow.skipDeliver")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mb-3">
            <CheckCircle2 size={28} className="text-brand-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">{doctor8Delivered ? t("rx.flow.deliveredDoctor8") : t(savedTitleKey)}</p>
          <p className="text-slate-500 text-sm mt-1">{patient.firstName} {patient.lastName}</p>
        </div>

        {doctor8Delivered && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-brand-500 shrink-0 mt-0.5" />
            <p>{patient.hasAccount ? t("rx.flow.doctor8Notice") : t("rx.flow.doctor8NoticeNoAccount")}</p>
          </div>
        )}

        {patient.hasAccount && doctor8Delivered ? (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-brand-500 shrink-0 mt-0.5" />
            <p>{t("rx3.notifiedText")}</p>
          </div>
        ) : !doctor8Delivered && patient.hasAccount ? (
          <div className="space-y-3">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
              <p>{t("rx.flow.doctor8Notice")}</p>
            </div>
            <Doctor8DeliverButton
              kind={emission.kind}
              id={emission.id}
              t={t}
              size="full"
              apiBase={apiBase}
              onDelivered={(data) => {
                setShareUrl(data.shareUrl || "");
                setDoctor8Delivered(true);
              }}
              onError={setDeliverError}
            />
          </div>
        ) : !doctor8Delivered && patient.email ? (
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
        ) : !doctor8Delivered ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
            {t("rx3.noEmailText")}
          </div>
        ) : null}

        {deliverError && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{deliverError}</p>
        )}

        <button onClick={openWhatsApp}
          className="w-full py-3.5 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-800 font-semibold text-sm transition flex items-center justify-center gap-2">
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

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
          <p>{patient.hasAccount ? t("rx.flow.doctor8Notice") : t("rx.flow.doctor8NoticeNoAccount")}</p>
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
            {t("rx.flow.sendDoctor8")}
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
